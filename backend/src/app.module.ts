import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './common/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ProjectGroupsModule } from './modules/project-groups/project-groups.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageStatsModule } from './modules/storage/storage.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VideosModule } from './modules/videos/videos.module';
import { TagsModule } from './modules/tags/tags.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AnnotationsModule } from './modules/annotations/annotations.module';
import { SharesModule } from './modules/shares/shares.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { ShowcaseModule } from './modules/showcase/showcase.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ArchivingModule } from './modules/archiving/archiving.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { SearchModule } from './modules/search/search.module';
import { DevAdminModule } from './modules/admin/dev-admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectGroupsModule,
    AuditModule,
    StorageStatsModule,
    ProjectsModule,
    VideosModule,
    TagsModule,
    UploadsModule,
    AnnotationsModule,
    SharesModule,
    DeliveriesModule,
    ShowcaseModule,
    DashboardModule,
    NotificationsModule,
    ArchivingModule,
    TrackingModule,
    SearchModule,
    DevAdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

