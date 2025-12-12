import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import { VideoTag } from './entities/video-tag.entity';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoTag)
    private videoTagRepository: Repository<VideoTag>,
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
}

