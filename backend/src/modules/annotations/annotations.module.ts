import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { Annotation } from './entities/annotation.entity';
import { Video } from '../videos/entities/video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Annotation, Video])],
  controllers: [AnnotationsController],
  providers: [AnnotationsService],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}

