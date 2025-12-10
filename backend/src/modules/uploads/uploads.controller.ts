import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/upload')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('init')
  async initUpload(@Body() body: { projectId: string; filename: string; totalSize: number }, @Request() req) {
    return this.uploadsService.createTask(req.user.id, body.projectId, body.filename, body.totalSize);
  }

  @Get('tasks')
  async getTasks(@Request() req) {
    return this.uploadsService.findAll(req.user.id);
  }
}

