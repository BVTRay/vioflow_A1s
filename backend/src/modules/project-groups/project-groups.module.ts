import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectGroupsService } from './project-groups.service';
import { ProjectGroupsController } from './project-groups.controller';
import { ProjectGroup } from './entities/project-group.entity';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectGroup]),
    forwardRef(() => TeamsModule),
  ],
  controllers: [ProjectGroupsController],
  providers: [ProjectGroupsService],
  exports: [ProjectGroupsService],
})
export class ProjectGroupsModule {}

