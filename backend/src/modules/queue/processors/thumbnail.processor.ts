import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThumbnailService } from '../../../common/video/thumbnail.service';
import { Video } from '../../videos/entities/video.entity';
import { IStorageService } from '../../../common/storage/storage.interface';
import { ThumbnailJobData, ThumbnailJobResult } from '../interfaces/thumbnail-job.interface';

const THUMBNAIL_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.THUMBNAIL_CONCURRENCY || '2', 10) || 2,
);

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

  @Process({ name: 'generate', concurrency: THUMBNAIL_CONCURRENCY })
  async handleThumbnailGeneration(job: Job<ThumbnailJobData>): Promise<ThumbnailJobResult | null> {
    const { videoId, videoKey, timestamp } = job.data;
    
    this.logger.log(`[ThumbnailProcessor] 开始处理缩略图生成任务: videoId=${videoId}, videoKey=${videoKey}`);

    try {
      let result: ThumbnailJobResult | null = null;

      // local 存储优先：直接用磁盘路径让 FFmpeg 读取（最快）
      try {
        const filePath = (this.storageService as any).getFileSystemPath?.(videoKey);
        if (typeof filePath === 'string' && filePath.length > 0) {
          result = await this.thumbnailService.generateThumbnailFromFilePath(
            filePath,
            videoKey,
            timestamp,
          );
        }
      } catch (fileError: any) {
        this.logger.warn(
          `[ThumbnailProcessor] 本地文件路径取帧失败，将尝试URL路径: ${fileError?.message || fileError}`,
        );
      }

      // 其次尝试：使用签名URL让 FFmpeg 直接取帧，避免下载整段视频到内存
      try {
        if (!result) {
          const signedUrl = await this.storageService.getSignedUrl(videoKey, 15 * 60);
          result = await this.thumbnailService.generateThumbnailFromUrl(
            signedUrl,
            videoKey,
            timestamp,
          );
        }
      } catch (urlError: any) {
        this.logger.warn(
          `[ThumbnailProcessor] URL取帧路径失败，将回退到下载Buffer路径: ${urlError?.message || urlError}`,
        );
      }

      // 回退：从存储中下载视频文件（兼容无法直连URL的环境）
      if (!result) {
        const videoBuffer = await this.storageService.downloadFile(videoKey);

        if (!videoBuffer) {
          throw new Error(`无法从存储下载视频文件: ${videoKey}`);
        }

        this.logger.log(`[ThumbnailProcessor] 视频文件下载成功: ${videoBuffer.length} bytes`);

        result = await this.thumbnailService.generateThumbnail(
          videoBuffer,
          videoKey,
          timestamp,
        );
      }

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

