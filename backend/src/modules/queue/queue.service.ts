import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ThumbnailJobData } from './interfaces/thumbnail-job.interface';
import { PdfExportJobData } from './interfaces/pdf-export-job.interface';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('thumbnail') private thumbnailQueue: Queue,
    @InjectQueue('pdf-export') private pdfExportQueue: Queue,
  ) {}

  /**
   * 添加缩略图生成任务到队列
   */
  async addThumbnailJob(data: ThumbnailJobData) {
    try {
      const job = await this.thumbnailQueue.add('generate', data, {
        attempts: 3, // 重试3次
        backoff: {
          type: 'exponential',
          delay: 2000, // 初始延迟2秒
        },
        removeOnComplete: true, // 完成后移除
        removeOnFail: false, // 失败后保留用于调试
      });

      this.logger.log(`[QueueService] 缩略图任务已添加到队列: jobId=${job.id}, videoId=${data.videoId}`);
      return job;
    } catch (error: any) {
      this.logger.error(`[QueueService] 添加缩略图任务失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加PDF导出任务到队列
   */
  async addPdfExportJob(data: PdfExportJobData) {
    try {
      const job = await this.pdfExportQueue.add('export', data, {
        attempts: 2, // 重试2次
        backoff: {
          type: 'exponential',
          delay: 5000, // 初始延迟5秒
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`[QueueService] PDF导出任务已添加到队列: jobId=${job.id}, videoId=${data.videoId}`);
      return job;
    } catch (error: any) {
      this.logger.error(`[QueueService] 添加PDF导出任务失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    const [thumbnailWaiting, thumbnailActive, thumbnailCompleted, thumbnailFailed] = await Promise.all([
      this.thumbnailQueue.getWaitingCount(),
      this.thumbnailQueue.getActiveCount(),
      this.thumbnailQueue.getCompletedCount(),
      this.thumbnailQueue.getFailedCount(),
    ]);

    const [pdfWaiting, pdfActive, pdfCompleted, pdfFailed] = await Promise.all([
      this.pdfExportQueue.getWaitingCount(),
      this.pdfExportQueue.getActiveCount(),
      this.pdfExportQueue.getCompletedCount(),
      this.pdfExportQueue.getFailedCount(),
    ]);

    return {
      thumbnail: {
        waiting: thumbnailWaiting,
        active: thumbnailActive,
        completed: thumbnailCompleted,
        failed: thumbnailFailed,
      },
      pdfExport: {
        waiting: pdfWaiting,
        active: pdfActive,
        completed: pdfCompleted,
        failed: pdfFailed,
      },
    };
  }
}


