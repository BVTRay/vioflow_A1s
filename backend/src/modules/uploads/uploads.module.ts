import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadTask } from './entities/upload-task.entity';
import { StorageModule } from '../../common/storage/storage.module';
import { VideosModule } from '../videos/videos.module';
import { VideoModule } from '../../common/video/video.module';
import { StorageStatsModule } from '../storage/storage.module';
import { ProjectsModule } from '../projects/projects.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadTask]),
    StorageModule,
    VideosModule,
    VideoModule,
    forwardRef(() => StorageStatsModule),
    forwardRef(() => ProjectsModule),
    QueueModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

