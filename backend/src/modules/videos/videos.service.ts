import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus, VideoType, StorageTier, AspectRatio } from './entities/video.entity';
import { VideoTag } from './entities/video-tag.entity';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoTag)
    private videoTagRepository: Repository<VideoTag>,
    private storageService: SupabaseStorageService,
  ) {}

  async findAll(filters?: {
    projectId?: string;
    isCaseFile?: boolean;
    tags?: string[];
    teamId?: string;
  }): Promise<Video[]> {
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoin('video.project', 'project');

    // 强制要求 teamId（多租户模式）
    if (filters?.teamId) {
      query.andWhere('project.team_id = :teamId', { teamId: filters.teamId });
      console.log(`[VideosService] 查询视频，团队 ID: ${filters.teamId}`);
    } else {
      // 如果没有提供 teamId，返回空数组（多租户模式下必须提供 teamId）
      console.log('[VideosService] ⚠️ 没有提供 teamId，返回空数组');
      return [];
    }

    if (filters?.projectId) {
      query.andWhere('video.project_id = :projectId', { projectId: filters.projectId });
    }

    if (filters?.isCaseFile !== undefined) {
      query.andWhere('video.is_case_file = :isCaseFile', { isCaseFile: filters.isCaseFile });
    }

    const results = await query.getMany();
    console.log(`[VideosService] 找到 ${results.length} 个视频`);
    return results;
  }

  async findOne(id: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['project', 'video_tags', 'video_tags.tag'],
    });
    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }
    return video;
  }

  async getVersions(projectId: string, baseName: string): Promise<Video[]> {
    return this.videoRepository.find({
      where: { project_id: projectId, base_name: baseName },
      order: { version: 'DESC' },
    });
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
   * 批量打标
   */
  async batchTag(videoIds: string[], tagIds: string[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const videoId of videoIds) {
      try {
        await this.updateTags(videoId, tagIds);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
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
      duration: data.duration,
      resolution: data.resolution,
      aspect_ratio: data.aspectRatio,
      thumbnail_url: data.thumbnailUrl,
    });

    return this.videoRepository.save(video);
  }

  /**
   * 删除单个视频版本
   */
  async deleteVersion(videoId: string): Promise<void> {
    const video = await this.findOne(videoId);
    
    // 删除存储中的文件
    if (video.storage_key) {
      try {
        await this.storageService.deleteFile(video.storage_key);
      } catch (error) {
        console.warn(`Failed to delete storage file for video ${videoId}:`, error);
        // 继续删除数据库记录，即使存储删除失败
      }
    }

    // 删除缩略图（如果存在）
    if (video.thumbnail_url) {
      // 从thumbnail_url中提取key（如果可能）
      // 这里假设缩略图的key可以从URL中提取，或者存储在某个字段中
      // 如果无法提取，可以跳过缩略图删除
      try {
        // 尝试从URL中提取路径
        const urlParts = video.thumbnail_url.split('/');
        const thumbnailKey = urlParts[urlParts.length - 1];
        if (thumbnailKey && thumbnailKey !== video.thumbnail_url) {
          await this.storageService.deleteFile(thumbnailKey);
        }
      } catch (error) {
        console.warn(`Failed to delete thumbnail for video ${videoId}:`, error);
      }
    }

    // 删除数据库记录（级联删除会处理关联的批注和标签）
    await this.videoRepository.remove(video);
  }

  /**
   * 删除视频的所有版本（根据base_name）
   */
  async deleteAllVersions(projectId: string, baseName: string): Promise<void> {
    const videos = await this.videoRepository.find({
      where: { project_id: projectId, base_name: baseName },
    });

    // 删除所有版本的文件和记录
    for (const video of videos) {
      // 删除存储中的文件
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
    }

    // 删除所有数据库记录
    await this.videoRepository.remove(videos);
  }
}

