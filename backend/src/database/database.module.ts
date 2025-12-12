import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { Video } from '../modules/videos/entities/video.entity';
import { Tag } from '../modules/tags/entities/tag.entity';
import { Annotation } from '../modules/annotations/entities/annotation.entity';
import { ShareLink } from '../modules/shares/entities/share-link.entity';
import { ShareLinkAccessLog } from '../modules/shares/entities/share-link-access-log.entity';
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
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember } from '../modules/teams/entities/team-member.entity';
import { ProjectGroup } from '../modules/project-groups/entities/project-group.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { StorageUsage } from '../modules/storage/entities/storage-usage.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // 支持 Railway 和 Supabase 的 DATABASE_URL 环境变量
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        
        let dbConfig: any;
        
        if (databaseUrl) {
          // 检测是否为 Supabase 连接
          const isSupabase = databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase.com');
          
          try {
            // 解析 DATABASE_URL
            const urlObj = new URL(databaseUrl);
            
            dbConfig = {
              type: 'postgres',
              host: urlObj.hostname,
              port: parseInt(urlObj.port, 10) || 5432,
              username: decodeURIComponent(urlObj.username),
              password: decodeURIComponent(urlObj.password),
              database: urlObj.pathname.slice(1), // 移除前导斜杠
            };
            
            // SSL 配置：Supabase 必须启用，生产环境也建议启用
            if (isSupabase || nodeEnv === 'production') {
              dbConfig.ssl = {
                rejectUnauthorized: false, // 允许自签名证书
              };
            }
            
            // 记录连接信息（隐藏密码）
            const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
            console.log(`📌 数据库连接: ${isSupabase ? 'Supabase' : 'PostgreSQL'}`);
            console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
            console.log(`   Database: ${dbConfig.database}`);
            console.log(`   Username: ${dbConfig.username}`);
          } catch (error) {
            // 如果 URL 解析失败，记录错误并使用默认配置
            console.error('Failed to parse DATABASE_URL:', error);
            throw new Error('Invalid DATABASE_URL format');
          }
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
          
          // 记录连接信息
          console.log(`📌 数据库连接: 本地 PostgreSQL`);
          console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
          console.log(`   Database: ${dbConfig.database}`);
          console.log(`   Username: ${dbConfig.username}`);
          console.log(`   ⚠️  提示: 未设置 DATABASE_URL，使用本地数据库配置`);
        }

        return {
          ...dbConfig,
          entities: [
            User,
            Team,
            TeamMember,
            Project,
            ProjectMember,
            ProjectGroup,
            Video,
            VideoTag,
            Tag,
            Annotation,
            ShareLink,
            ShareLinkAccessLog,
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
            AuditLog,
            StorageUsage,
          ],
          synchronize: false, // 禁用自动同步（Supabase 已有触发器和约束，不能自动修改）
          logging: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

