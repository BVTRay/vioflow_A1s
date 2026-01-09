import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VideosService } from './videos.service';

@Injectable()
export class VideosCleanupService {
  private readonly logger = new Logger(VideosCleanupService.name);

  constructor(private readonly videosService: VideosService) {}

  /**
   * 每天凌晨2点执行清理任务
   * 清理30天前删除的视频
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanup() {
    this.logger.log('开始执行回收站自动清理任务...');
    try {
      const count = await this.videosService.cleanupOldDeletedVideos();
      this.logger.log(`回收站清理完成，共清理 ${count} 个视频`);
    } catch (error) {
      this.logger.error('回收站清理任务执行失败:', error);
    }
  }
}




















