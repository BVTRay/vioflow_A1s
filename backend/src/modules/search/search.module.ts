import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ProjectsModule } from '../projects/projects.module';
import { VideosModule } from '../videos/videos.module';
import { ShowcaseModule } from '../showcase/showcase.module';

@Module({
  imports: [ProjectsModule, VideosModule, ShowcaseModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}

