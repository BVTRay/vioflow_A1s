import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(':projectId')
  findByProjectId(@Param('projectId') projectId: string) {
    return this.deliveriesService.findByProjectId(projectId);
  }

  @Patch(':projectId')
  update(@Param('projectId') projectId: string, @Body() body: any) {
    return this.deliveriesService.update(projectId, body);
  }

  @Post(':projectId/complete')
  completeDelivery(@Param('projectId') projectId: string) {
    return this.deliveriesService.completeDelivery(projectId);
  }

  @Get(':projectId/folders')
  getFolders(@Param('projectId') projectId: string) {
    return this.deliveriesService.getFolders(projectId);
  }

  @Get(':projectId/packages')
  getPackages(@Param('projectId') projectId: string) {
    return this.deliveriesService.getPackages(projectId);
  }

  @Post(':projectId/packages')
  createPackage(@Param('projectId') projectId: string, @Body() body: any) {
    return this.deliveriesService.createPackage(projectId, body);
  }
}

