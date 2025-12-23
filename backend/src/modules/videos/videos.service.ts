import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, IsNull, Repository } from 'typeorm';
import { Video, VideoStatus, VideoType, StorageTier, AspectRatio } from './entities/video.entity';
import { VideoTag } from './entities/video-tag.entity';
import { IStorageService } from '../../common/storage/storage.interface';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoTag)
    private videoTagRepository: Repository<VideoTag>,
    @Inject('IStorageService')
    private storageService: IStorageService,
  ) {}

  async findAll(filters?: {
    projectId?: string;
    isCaseFile?: boolean;
    tags?: string[];
    teamId?: string;
    includeDeleted?: boolean;
    includeRelations?: boolean; // 是否包含关联数据（项目、团队、上传者）
    page?: number;
    limit?: number;
    search?: string; // 搜索关键词
  }): Promise<{ data: Video[]; total: number; page: number; limit: number }> {
    const query = this.videoRepository.createQueryBuilder('video');
    
    // 如果需要关联数据，加载相关关系
    if (filters?.includeRelations) {
      query
        .leftJoinAndSelect('video.project', 'project')
        .leftJoinAndSelect('project.team', 'team')
        .leftJoinAndSelect('video.uploader', 'uploader');
    } else {
      query.leftJoin('video.project', 'project');
    }

    // 强制要求 teamId（多租户模式）
    if (filters?.teamId) {
      query.andWhere('project.team_id = :teamId', { teamId: filters.teamId });
      console.log(`[VideosService] 查询视频，团队 ID: ${filters.teamId}`);
    } else {
      // 如果没有提供 teamId，返回空数组（多租户模式下必须提供 teamId）
      console.log('[VideosService] ⚠️ 没有提供 teamId，返回空数组');
      return { data: [], total: 0, page: 1, limit: 50 };
    }

    if (filters?.projectId) {
      query.andWhere('video.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters?.isCaseFile !== undefined) {
      query.andWhere('video.is_case_file = :isCaseFile', { isCaseFile: filters.isCaseFile });
    }

    // 搜索功能：在名称和原始文件名中搜索
    if (filters?.search) {
      query.andWhere(
        '(video.name ILIKE :search OR video.original_filename ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // 默认过滤已删除的视频
    if (!filters?.includeDeleted) {
      query.andWhere('video.deleted_at IS NULL');
    }

    // 获取总数
    const total = await query.getCount();

    // 分页
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;
    
    query.skip(skip).take(limit);
    query.orderBy('video.upload_time', 'DESC');

    const results = await query.getMany();
    console.log(`[VideosService] 找到 ${results.length} 个视频 (总数: ${total}, 页码: ${page}, 每页: ${limit})`);
    
    return {
      data: results,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取所有视频（管理员模式，包含所有团队）
   */
  async findAllForAdmin(includeDeleted: boolean = false): Promise<Video[]> {
    console.log('[VideosService] findAllForAdmin 被调用，includeDeleted:', includeDeleted);
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoinAndSelect('video.project', 'project')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('video.uploader', 'uploader')
      .orderBy('video.created_at', 'DESC');

    // 默认过滤已删除的视频
    if (!includeDeleted) {
      query.andWhere('video.deleted_at IS NULL');
    }

    const results = await query.getMany();
    console.log(`[VideosService] 管理员模式：找到 ${results.length} 个视频`);
    return results;
  }

  async findOne(id: string, includeDeleted: boolean = false): Promise<Video> {
    if (includeDeleted) {
      const video = await this.videoRepository.findOne({
        where: { id },
        relations: ['project', 'video_tags', 'video_tags.tag'],
      });
      if (!video) {
        throw new NotFoundException(`Video with ID ${id} not found`);
      }
      return video;
    } else {
      // 使用 QueryBuilder 来正确处理 null 值
      const video = await this.videoRepository
        .createQueryBuilder('video')
        .leftJoinAndSelect('video.project', 'project')
        .leftJoinAndSelect('video.video_tags', 'video_tags')
        .leftJoinAndSelect('video_tags.tag', 'tag')
        .where('video.id = :id', { id })
        .andWhere('video.deleted_at IS NULL')
        .getOne();
      
      if (!video) {
        throw new NotFoundException(`Video with ID ${id} not found`);
      }
      return video;
    }
  }

  async getVersions(projectId: string, baseName: string, includeDeleted: boolean = false): Promise<Video[]> {
    if (includeDeleted) {
      return this.videoRepository.find({
        where: { project_id: projectId, base_name: baseName },
        order: { version: 'DESC' },
      });
    } else {
      return this.videoRepository
        .createQueryBuilder('video')
        .where('video.project_id = :projectId', { projectId })
        .andWhere('video.base_name = :baseName', { baseName })
        .andWhere('video.deleted_at IS NULL')
        .orderBy('video.version', 'DESC')
        .getMany();
    }
  }

  async createReference(videoId: string, projectId: string): Promise<Video> {
    const originalVideo = await this.findOne(videoId);
    const referenceVideo = this.videoRepository.create({
      ...originalVideo,
      id: undefined,
      project_id: projectId,
      is_reference: true,
      referenced_video_id: videoId,
      is_case_file: true,
    });
    return this.videoRepository.save(referenceVideo);
  }

  async updateTags(videoId: string, tagIds: string[]): Promise<Video> {
    const video = await this.findOne(videoId);
    
    // 删除现有标签关联
    await this.videoTagRepository.delete({ video_id: videoId });
    
    // 创建新的标签关联
    const videoTags = tagIds.map(tagId =>
      this.videoTagRepository.create({
        video_id: videoId,
        tag_id: tagId,
      })
    );
    await this.videoTagRepository.save(videoTags);
    
    return this.findOne(videoId);
  }

  async toggleCaseFile(videoId: string): Promise<Video> {
    const video = await this.findOne(videoId);
    video.is_case_file = !video.is_case_file;
    return this.videoRepository.save(video);
  }

  async toggleMainDelivery(videoId: string): Promise<Video> {
    const video = await this.findOne(videoId);
    video.is_main_delivery = !video.is_main_delivery;
    if (video.is_main_delivery) {
      video.is_case_file = true;
    }
    return this.videoRepository.save(video);
  }

  /**
   * 批量打标 - 使用批量SQL操作，避免N+1问题
   */
  async batchTag(videoIds: string[], tagIds: string[]): Promise<{ success: number; failed: number }> {
    if (videoIds.length === 0 || tagIds.length === 0) {
      return { success: 0, failed: 0 };
    }

    try {
      // 先删除所有视频的现有标签关联
      await this.videoTagRepository
        .createQueryBuilder()
        .delete()
        .where('video_id IN (:...videoIds)', { videoIds })
        .execute();

      // 批量创建新的标签关联
      const videoTags = [];
      for (const videoId of videoIds) {
        for (const tagId of tagIds) {
          videoTags.push(
            this.videoTagRepository.create({
              video_id: videoId,
              tag_id: tagId,
            })
          );
        }
      }

      if (videoTags.length > 0) {
        // 使用批量插入，提高性能
        await this.videoTagRepository.save(videoTags);
      }

      return { success: videoIds.length, failed: 0 };
    } catch (error: any) {
      console.error('[VideosService] 批量打标失败:', error);
      return { success: 0, failed: videoIds.length };
    }
  }

  /**
   * 更新视频状态
   */
  async updateStatus(videoId: string, status: 'initial' | 'annotated' | 'approved'): Promise<Video> {
    const video = await this.findOne(videoId);
    video.status = status as VideoStatus;
    return this.videoRepository.save(video);
  }

  /**
   * 更新视频信息（管理员模式）
   */
  async update(videoId: string, data: {
    name?: string;
    baseName?: string;
    version?: number;
    changeLog?: string;
  }): Promise<Video> {
    const video = await this.findOne(videoId, true); // 允许更新已删除的视频
    
    if (data.name !== undefined) {
      video.name = data.name;
    }
    if (data.baseName !== undefined) {
      video.base_name = data.baseName;
    }
    if (data.version !== undefined) {
      video.version = data.version;
    }
    if (data.changeLog !== undefined) {
      video.change_log = data.changeLog;
    }

    return this.videoRepository.save(video);
  }

  /**
   * 获取视频播放URL
   * 如果存储桶是私有的，返回签名URL；否则返回公共URL
   */
  async getPlaybackUrl(videoId: string, useSignedUrl: boolean = true): Promise<string> {
    const video = await this.findOne(videoId);
    
    if (!video.storage_key) {
      // 如果没有 storage_key，直接返回 storage_url
      return video.storage_url;
    }

    try {
      if (useSignedUrl) {
        // 尝试获取签名URL（适用于私有存储桶）
        // 签名URL有效期1小时
        return await this.storageService.getSignedUrl(video.storage_key, 3600);
      } else {
        // 获取公共URL（适用于公开存储桶）
        return await this.storageService.getPublicUrl(video.storage_key);
      }
    } catch (error) {
      // 如果获取签名URL失败，回退到存储的URL
      console.warn(`Failed to get signed URL for video ${videoId}, using stored URL:`, error);
      return video.storage_url;
    }
  }

  /**
   * 创建视频记录
   */
  async create(data: {
    projectId: string;
    name: string;
    originalFilename: string;
    baseName: string;
    version: number;
    type: VideoType;
    storageUrl: string;
    storageKey: string;
    storageTier: StorageTier;
    size: number;
    uploaderId: string;
    changeLog?: string;
    duration?: number;
    resolution?: string;
    aspectRatio?: AspectRatio;
    thumbnailUrl?: string;
  }): Promise<Video> {
    try {
      console.log('[VideosService] 创建视频记录:', {
        projectId: data.projectId,
        name: data.name,
        version: data.version,
        uploaderId: data.uploaderId,
        storageUrlLength: data.storageUrl?.length,
        storageKeyLength: data.storageKey?.length,
      });

      // 确保 duration 是整数（秒数），因为数据库字段是 integer 类型
      const durationInSeconds = data.duration ? Math.round(data.duration) : undefined;
      
      const video = this.videoRepository.create({
        project_id: data.projectId,
        name: data.name,
        original_filename: data.originalFilename,
        base_name: data.baseName,
        version: data.version,
        type: data.type,
        storage_url: data.storageUrl,
        storage_key: data.storageKey,
        storage_tier: data.storageTier,
        size: data.size,
        uploader_id: data.uploaderId,
        upload_time: new Date(),
        status: VideoStatus.INITIAL,
        change_log: data.changeLog,
        duration: durationInSeconds,
        resolution: data.resolution,
        aspect_ratio: data.aspectRatio,
        thumbnail_url: data.thumbnailUrl,
      });

      const savedVideo = await this.videoRepository.save(video);
      console.log('[VideosService] 视频记录保存成功:', savedVideo.id);
      return savedVideo;
    } catch (error: any) {
      console.error('[VideosService] 创建视频记录失败:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 软删除单个视频版本
   */
  async deleteVersion(videoId: string): Promise<void> {
    try {
      console.log(`[VideosService] 开始软删除视频: ${videoId}`);
      
      // 先检查视频是否存在且未删除
      const video = await this.findOne(videoId);
      
      if (!video) {
        throw new NotFoundException(`Video with ID ${videoId} not found`);
      }

      // 检查是否已经删除
      if (video.deleted_at) {
        console.log(`[VideosService] 视频 ${videoId} 已经被删除`);
        return; // 已经删除，直接返回
      }
      
      // 使用 QueryBuilder 的 update 方法进行软删除，更可靠
      const result = await this.videoRepository
        .createQueryBuilder()
        .update(Video)
        .set({ deleted_at: new Date() })
        .where('id = :id', { id: videoId })
        .andWhere('deleted_at IS NULL')
        .execute();
      
      if (result.affected === 0) {
        throw new Error(`Failed to soft delete video ${videoId}`);
      }
      
      console.log(`[VideosService] 视频 ${videoId} 已软删除`);
    } catch (error: any) {
      console.error(`[VideosService] 软删除视频失败: ${videoId}`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * 彻底删除单个视频版本（从回收站删除）
   */
  async permanentlyDeleteVersion(videoId: string): Promise<void> {
    const video = await this.findOne(videoId, true); // 包括已删除的
    
    // 删除存储中的文件
    if (video.storage_key) {
      try {
        await this.storageService.deleteFile(video.storage_key);
      } catch (error) {
        console.warn(`Failed to delete storage file for video ${videoId}:`, error);
      }
    }

    // 删除缩略图（如果存在）
    if (video.thumbnail_url) {
      try {
        const urlParts = video.thumbnail_url.split('/');
        const thumbnailKey = urlParts[urlParts.length - 1];
        if (thumbnailKey && thumbnailKey !== video.thumbnail_url) {
          await this.storageService.deleteFile(thumbnailKey);
        }
      } catch (error) {
        console.warn(`Failed to delete thumbnail for video ${videoId}:`, error);
      }
    }

    // 删除标签关联
    await this.videoTagRepository.delete({ video_id: videoId });

    // 删除数据库记录
    await this.videoRepository.remove(video);
    
    console.log(`[VideosService] 视频 ${videoId} 已彻底删除`);
  }

  /**
   * 恢复已删除的视频
   */
  async restoreVideo(videoId: string): Promise<Video> {
    try {
      console.log(`[VideosService] 开始恢复视频: ${videoId}`);
      const video = await this.findOne(videoId, true); // 包括已删除的
      
      if (!video.deleted_at) {
        throw new Error('视频未被删除，无需恢复');
      }
      
      // 使用 QueryBuilder 的 update 方法恢复，更可靠
      await this.videoRepository
        .createQueryBuilder()
        .update(Video)
        .set({ deleted_at: null })
        .where('id = :id', { id: videoId })
        .execute();
      
      // 重新查询以返回完整的视频对象
      const restoredVideo = await this.findOne(videoId, false);
      
      console.log(`[VideosService] 视频 ${videoId} 已恢复`);
      return restoredVideo;
    } catch (error: any) {
      console.error(`[VideosService] 恢复视频失败: ${videoId}`, {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 软删除视频的所有版本（根据base_name）
   */
  async deleteAllVersions(projectId: string, baseName: string): Promise<void> {
    try {
      console.log(`[VideosService] 开始软删除所有版本: projectId=${projectId}, baseName=${baseName}`);
      
      // 使用 update 方法批量软删除，更可靠
      const result = await this.videoRepository
        .createQueryBuilder()
        .update(Video)
        .set({ deleted_at: new Date() })
        .where('project_id = :projectId', { projectId })
        .andWhere('base_name = :baseName', { baseName })
        .andWhere('deleted_at IS NULL')
        .execute();

      const affectedCount = result.affected || 0;
      
      if (affectedCount === 0) {
        console.log(`[VideosService] 没有找到未删除的视频版本`);
        return;
      }
      
      console.log(`[VideosService] ${affectedCount} 个视频版本已软删除`);
    } catch (error: any) {
      console.error(`[VideosService] 软删除所有版本失败: projectId=${projectId}, baseName=${baseName}`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * 获取回收站中的视频列表
   */
  async getDeletedVideos(teamId: string): Promise<Video[]> {
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoin('video.project', 'project')
      .where('video.deleted_at IS NOT NULL')
      .andWhere('project.team_id = :teamId', { teamId })
      .orderBy('video.deleted_at', 'DESC');

    return query.getMany();
  }

  /**
   * 清理30天前删除的视频
   */
  async cleanupOldDeletedVideos(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldDeletedVideos = await this.videoRepository.find({
      where: {
        deleted_at: LessThan(thirtyDaysAgo),
      },
    });

    if (oldDeletedVideos.length === 0) {
      return 0;
    }

    // 删除存储文件和数据库记录
    for (const video of oldDeletedVideos) {
      // 删除存储文件
      if (video.storage_key) {
        try {
          await this.storageService.deleteFile(video.storage_key);
        } catch (error) {
          console.warn(`Failed to delete storage file for video ${video.id}:`, error);
        }
      }

      // 删除缩略图
      if (video.thumbnail_url) {
        try {
          const urlParts = video.thumbnail_url.split('/');
          const thumbnailKey = urlParts[urlParts.length - 1];
          if (thumbnailKey && thumbnailKey !== video.thumbnail_url) {
            await this.storageService.deleteFile(thumbnailKey);
          }
        } catch (error) {
          console.warn(`Failed to delete thumbnail for video ${video.id}:`, error);
        }
      }

      // 删除标签关联
      await this.videoTagRepository.delete({ video_id: video.id });
    }

    // 删除数据库记录
    await this.videoRepository.remove(oldDeletedVideos);

    console.log(`[VideosService] 已清理 ${oldDeletedVideos.length} 个30天前删除的视频`);
    return oldDeletedVideos.length;
  }

  /**
   * 删除某个项目下的所有视频（软删除到回收站）
   */
  async deleteByProject(projectId: string): Promise<number> {
    const videos = await this.videoRepository.find({
      where: { project_id: projectId, deleted_at: IsNull() },
    });

    if (videos.length === 0) {
      return 0;
    }

    const videoIds = videos.map((video) => video.id);
    const now = new Date();

    // 软删除：设置 deleted_at 时间戳
    await this.videoRepository.update(
      { id: In(videoIds) },
      { deleted_at: now }
    );

    return videos.length;
  }

  /**
   * 检查资产名称在团队内是否唯一
   */
  async checkAssetNameUnique(baseName: string, teamId: string): Promise<{ unique: boolean; exists: boolean }> {
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoin('video.project', 'project')
      .where('project.team_id = :teamId', { teamId })
      .andWhere('video.base_name = :baseName', { baseName })
      .andWhere('video.deleted_at IS NULL');

    const existing = await query.getOne();
    return {
      unique: !existing,
      exists: !!existing,
    };
  }
}

