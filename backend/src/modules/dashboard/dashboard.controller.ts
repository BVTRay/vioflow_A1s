import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('active-projects')
  getActiveProjects(@Query('limit') limit?: number) {
    return this.dashboardService.getActiveProjects(limit ? parseInt(limit.toString()) : 10);
  }

  @Get('recent-opened')
  getRecentOpened(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentOpened(limit ? parseInt(limit.toString()) : 10);
  }
}

