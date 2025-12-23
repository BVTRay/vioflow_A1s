import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { Annotation } from './entities/annotation.entity';
import { Video } from '../videos/entities/video.entity';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Annotation, Video]),
    forwardRef(() => QueueModule),
  ],
  controllers: [AnnotationsController],
  providers: [AnnotationsService],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}

