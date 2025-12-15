import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annotation } from './entities/annotation.entity';
import { Video, VideoStatus } from '../videos/entities/video.entity';

@Injectable()
export class AnnotationsService {
  constructor(
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {}

  async findAll(videoId?: string): Promise<Annotation[]> {
    const query = this.annotationRepository
      .createQueryBuilder('annotation')
      .leftJoinAndSelect('annotation.user', 'user')
      .orderBy('annotation.created_at', 'ASC');
    
    if (videoId) {
      query.where('annotation.video_id = :videoId', { videoId });
    }
    
    return query.getMany();
  }

  async create(data: { videoId: string; userId: string; timecode: string; content: string; screenshotUrl?: string }): Promise<Annotation> {
    // 创建批注
    const annotation = this.annotationRepository.create({
      video_id: data.videoId,
      user_id: data.userId,
      timecode: data.timecode,
      content: data.content,
      screenshot_url: data.screenshotUrl,
    });
    const savedAnnotation = await this.annotationRepository.save(annotation);

    // 更新视频的批注计数和状态
    const video = await this.videoRepository.findOne({ where: { id: data.videoId } });
    if (video) {
      // 计算这是第几次批注（基于批注数量）
      const annotationCount = await this.annotationRepository.count({
        where: { video_id: data.videoId },
      });
      
      video.annotation_count = annotationCount;
      // 更新状态为 annotated（如果还不是的话）
      if (video.status !== VideoStatus.ANNOTATED && video.status !== VideoStatus.APPROVED) {
        video.status = VideoStatus.ANNOTATED;
      }
      await this.videoRepository.save(video);
    }

    return savedAnnotation;
  }

  async complete(id: string): Promise<Annotation> {
    const annotation = await this.annotationRepository.findOne({ where: { id } });
    if (annotation) {
      annotation.is_completed = true;
      annotation.completed_at = new Date();
      return this.annotationRepository.save(annotation);
    }
    return annotation;
  }

  async exportPdf(videoId: string): Promise<{ url: string }> {
    // TODO: 实现PDF导出
    const annotations = await this.findAll(videoId);
    return {
      url: `https://example.com/exports/${videoId}.pdf`, // 临时返回
    };
  }
}

