import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Annotation } from './entities/annotation.entity';

@Injectable()
export class AnnotationsService {
  constructor(
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
  ) {}

  async findAll(videoId?: string): Promise<Annotation[]> {
    const query = this.annotationRepository.createQueryBuilder('annotation');
    if (videoId) {
      query.where('annotation.video_id = :videoId', { videoId });
    }
    return query.getMany();
  }

  async create(data: { videoId: string; userId: string; timecode: string; content: string; screenshotUrl?: string }): Promise<Annotation> {
    const annotation = this.annotationRepository.create({
      video_id: data.videoId,
      user_id: data.userId,
      timecode: data.timecode,
      content: data.content,
      screenshot_url: data.screenshotUrl,
    });
    return this.annotationRepository.save(annotation);
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

