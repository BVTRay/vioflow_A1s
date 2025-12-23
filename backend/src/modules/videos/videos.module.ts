import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { VideosCleanupService } from './videos-cleanup.service';
import { Video } from './entities/video.entity';
import { VideoTag } from './entities/video-tag.entity';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Video, VideoTag]), StorageModule],
  controllers: [VideosController],
  providers: [VideosService, VideosCleanupService],
  exports: [VideosService],
})
export class VideosModule {}

