import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { VideosService } from '../videos/videos.service';
import { ShowcaseService } from '../showcase/showcase.service';

@Injectable()
export class SearchService {
  constructor(
    private projectsService: ProjectsService,
    private videosService: VideosService,
    private showcaseService: ShowcaseService,
  ) {}

  async globalSearch(query: string) {
    const [projects, videos, packages] = await Promise.all([
      this.projectsService.findAll().then(projects =>
        projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      ),
      this.videosService.findAll().then(videos =>
        videos.filter(v => v.name.toLowerCase().includes(query.toLowerCase()))
      ),
      this.showcaseService.findAll().then(packages =>
        packages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      ),
    ]);

    return {
      projects,
      videos,
      packages,
    };
  }
}

