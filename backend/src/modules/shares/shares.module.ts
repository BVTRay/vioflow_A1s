import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: '7d',
            issuer: configService.get('JWT_ISSUER', 'vioflow-api'),
            audience: configService.get('JWT_AUDIENCE', 'vioflow-client'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [SharesController],
  providers: [SharesService, AnnotationsService],
  exports: [SharesService],
})
export class SharesModule {}

