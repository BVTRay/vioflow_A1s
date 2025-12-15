import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadTask } from './entities/upload-task.entity';
import { StorageModule } from '../../common/storage/storage.module';
import { VideosModule } from '../videos/videos.module';
import { VideoModule } from '../../common/video/video.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadTask]),
    StorageModule,
    VideosModule,
    VideoModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

