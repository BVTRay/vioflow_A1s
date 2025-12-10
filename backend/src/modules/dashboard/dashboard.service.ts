import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class DashboardService {
  constructor(private projectsService: ProjectsService) {}

  async getActiveProjects(limit: number = 10) {
    return this.projectsService.getActiveProjects(limit);
  }

  async getRecentOpened(limit: number = 10) {
    return this.projectsService.getRecentOpened(limit);
  }
}

