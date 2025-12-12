import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { ShareLink } from './entities/share-link.entity';
import { ShareLinkAccessLog } from './entities/share-link-access-log.entity';
import { Annotation } from '../annotations/entities/annotation.entity';
import { AnnotationsService } from '../annotations/annotations.service';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink, ShareLinkAccessLog, Annotation]),
    forwardRef(() => TeamsModule),
  ],
  controllers: [SharesController],
  providers: [SharesService, AnnotationsService],
  exports: [SharesService],
})
export class SharesModule {}

