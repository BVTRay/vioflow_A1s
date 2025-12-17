import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { ShareLink } from './entities/share-link.entity';
import { ShareLinkAccessLog } from './entities/share-link-access-log.entity';
import { Annotation } from '../annotations/entities/annotation.entity';
import { Video } from '../videos/entities/video.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { AnnotationsService } from '../annotations/annotations.service';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink, ShareLinkAccessLog, Annotation, Video, Notification]),
    forwardRef(() => TeamsModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SharesController],
  providers: [SharesService, AnnotationsService],
  exports: [SharesService],
})
export class SharesModule {}

