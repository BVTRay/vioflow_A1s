import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { ShareLink } from '../shares/entities/share-link.entity';
import { TeamsModule } from '../teams/teams.module';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember, AuditLog, Delivery, ShareLink]),
    forwardRef(() => TeamsModule),
    VideosModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}

