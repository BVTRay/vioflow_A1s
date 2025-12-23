import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThumbnailService } from '../../../common/video/thumbnail.service';
import { Video } from '../../videos/entities/video.entity';
import { IStorageService } from '../../../common/storage/storage.interface';
import { ThumbnailJobData, ThumbnailJobResult } from '../interfaces/thumbnail-job.interface';

@Processor('thumbnail')
export class ThumbnailProcessor {
  private readonly logger = new Logger(ThumbnailProcessor.name);

  constructor(
    private readonly thumbnailService: ThumbnailService,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  @Process('generate')
  async handleThumbnailGeneration(job: Job<ThumbnailJobData>): Promise<ThumbnailJobResult | null> {
    const { videoId, videoKey, timestamp } = job.data;
    
    this.logger.log(`[ThumbnailProcessor] 开始处理缩略图生成任务: videoId=${videoId}, videoKey=${videoKey}`);

    try {
      // 从存储中下载视频文件
      const videoBuffer = await this.storageService.downloadFile(videoKey);
      
      if (!videoBuffer) {
        throw new Error(`无法从存储下载视频文件: ${videoKey}`);
      }

      this.logger.log(`[ThumbnailProcessor] 视频文件下载成功: ${videoBuffer.length} bytes`);

      // 生成缩略图
      const result = await this.thumbnailService.generateThumbnail(
        videoBuffer,
        videoKey,
        timestamp,
      );

      if (result) {
        // 更新视频记录的缩略图URL
        try {
          await this.videoRepository.update(videoId, {
            thumbnail_url: result.url,
            duration: result.duration ? Math.round(result.duration) : undefined,
          });
          this.logger.log(`[ThumbnailProcessor] 视频记录已更新: videoId=${videoId}, thumbnailUrl=${result.url}`);
        } catch (updateError: any) {
          this.logger.warn(`[ThumbnailProcessor] 更新视频记录失败: ${updateError.message}`);
        }

        this.logger.log(`[ThumbnailProcessor] 缩略图生成成功: ${result.url}`);
        return result;
      }

      return null;
    } catch (error: any) {
      this.logger.error(`[ThumbnailProcessor] 缩略图生成失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}

