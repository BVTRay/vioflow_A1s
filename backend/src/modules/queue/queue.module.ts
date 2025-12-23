import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThumbnailProcessor } from './processors/thumbnail.processor';
import { PdfExportProcessor } from './processors/pdf-export.processor';
import { QueueService } from './queue.service';
import { Video } from '../videos/entities/video.entity';
import { StorageModule } from '../../common/storage/storage.module';
import { VideoModule } from '../../common/video/video.module';
import { AnnotationsModule } from '../annotations/annotations.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL') || 'redis://localhost:6379';
        return {
          redis: {
            url: redisUrl,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'thumbnail' },
      { name: 'pdf-export' },
    ),
    TypeOrmModule.forFeature([Video]),
    StorageModule,
    VideoModule,
    forwardRef(() => AnnotationsModule),
  ],
  providers: [ThumbnailProcessor, PdfExportProcessor, QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}

