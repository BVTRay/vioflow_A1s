import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('update')
  updateProgress(@Body() body: {
    packageId: string;
    videoId: string;
    progress: number;
    durationWatched: number;
    viewerIp: string;
    userAgent: string;
  }) {
    return this.trackingService.updateProgress(body);
  }

  @Get('package/:packageId')
  getPackageTracking(@Param('packageId') packageId: string) {
    // TODO: 实现获取案例包观看统计
    return { packageId };
  }
}

