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

  async globalSearch(query: string, teamId?: string, limit: number = 20) {
    // 使用数据库侧搜索，而不是在前端过滤
    const [projectsResult, videosResult, packages] = await Promise.all([
      this.projectsService.findAll({
        teamId,
        search: query,
        limit,
      }),
      this.videosService.findAll({
        teamId,
        search: query,
        limit,
      }),
      // Showcase服务暂时保持原样，后续可以优化
      this.showcaseService.findAll().then(packages =>
        packages.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, limit)
      ),
    ]);

    return {
      projects: projectsResult.data || [],
      videos: videosResult.data || [],
      packages,
      total: {
        projects: projectsResult.total || 0,
        videos: videosResult.total || 0,
        packages: packages.length,
      },
    };
  }
}

