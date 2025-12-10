import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/annotations')
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  @Get()
  findAll(@Query('videoId') videoId?: string) {
    return this.annotationsService.findAll(videoId);
  }

  @Post()
  create(@Body() body: { videoId: string; timecode: string; content: string; screenshotUrl?: string }, @Request() req) {
    return this.annotationsService.create({
      ...body,
      userId: req.user.id,
    });
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.annotationsService.complete(id);
  }

  @Get('export/:videoId')
  exportPdf(@Param('videoId') videoId: string) {
    return this.annotationsService.exportPdf(videoId);
  }
}

