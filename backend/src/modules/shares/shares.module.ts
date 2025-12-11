import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { ShareLink } from './entities/share-link.entity';
import { Annotation } from '../annotations/entities/annotation.entity';
import { AnnotationsService } from '../annotations/annotations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShareLink, Annotation])],
  controllers: [SharesController],
  providers: [SharesService, AnnotationsService],
  exports: [SharesService],
})
export class SharesModule {}

