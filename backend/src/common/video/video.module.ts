import { Module } from '@nestjs/common';
import { ThumbnailService } from './thumbnail.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ThumbnailService],
  exports: [ThumbnailService],
})
export class VideoModule {}



