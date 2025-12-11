import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Video } from '../modules/videos/entities/video.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { Annotation } from '../modules/annotations/entities/annotation.entity';
import { ShareLink } from '../modules/shares/entities/share-link.entity';
import { Delivery } from '../modules/deliveries/entities/delivery.entity';
import { DeliveryFolder } from '../modules/deliveries/entities/delivery-folder.entity';
import { DeliveryFile } from '../modules/deliveries/entities/delivery-file.entity';
import { DeliveryPackage } from '../modules/deliveries/entities/delivery-package.entity';
import { ShowcasePackage } from '../modules/showcase/entities/showcase-package.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { UploadTask } from '../modules/uploads/entities/upload-task.entity';
import { ArchivingTask } from '../modules/archiving/entities/archiving-task.entity';
import { ViewTracking } from '../modules/tracking/entities/view-tracking.entity';
import { ProjectMember } from '../modules/projects/entities/project-member.entity';
import { VideoTag } from '../modules/videos/entities/video-tag.entity';
import { ShowcasePackageVideo } from '../modules/showcase/entities/showcase-package-video.entity';
import { DeliveryPackageFile } from '../modules/deliveries/entities/delivery-package-file.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // 支持 Railway 的 DATABASE_URL 环境变量
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        let dbConfig: any;
        
        if (databaseUrl) {
          // 解析 DATABASE_URL (格式: postgresql://user:password@host:port/database)
          const url = new URL(databaseUrl);
          dbConfig = {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port, 10) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // 移除前导斜杠
            ssl: url.searchParams.get('sslmode') !== 'disable' ? { rejectUnauthorized: false } : false,
          };
        } else {
          // 使用单独的环境变量（开发环境）
          dbConfig = {
            type: 'postgres',
            host: configService.get('DB_HOST', 'localhost'),
            port: configService.get('DB_PORT', 5432),
            username: configService.get('DB_USERNAME', 'postgres'),
            password: configService.get('DB_PASSWORD', 'postgres'),
            database: configService.get('DB_DATABASE', 'vioflow_mam'),
          };
        }

        return {
          ...dbConfig,
          entities: [
            User,
            Project,
            ProjectMember,
            Video,
            VideoTag,
            Tag,
            Annotation,
            ShareLink,
            Delivery,
            DeliveryFolder,
            DeliveryFile,
            DeliveryPackage,
            DeliveryPackageFile,
            ShowcasePackage,
            ShowcasePackageVideo,
            Notification,
            UploadTask,
            ArchivingTask,
            ViewTracking,
          ],
          synchronize: configService.get('NODE_ENV') !== 'production', // 生产环境禁用自动同步
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

