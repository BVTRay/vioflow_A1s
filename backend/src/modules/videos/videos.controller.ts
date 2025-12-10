import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  findAll(@Query('projectId') projectId?: string, @Query('isCaseFile') isCaseFile?: string) {
    let isCase: boolean | undefined = undefined;
    if (isCaseFile === 'true') isCase = true;
    if (isCaseFile === 'false') isCase = false;
    return this.videosService.findAll({ projectId, isCaseFile: isCase });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }

  @Get(':id/versions')
  getVersions(@Param('id') id: string) {
    return this.videosService.findOne(id).then(video => 
      this.videosService.getVersions(video.project_id, video.base_name)
    );
  }

  @Patch(':id/tags')
  updateTags(@Param('id') id: string, @Body() body: { tagIds: string[] }) {
    return this.videosService.updateTags(id, body.tagIds);
  }

  @Patch(':id/case-file')
  toggleCaseFile(@Param('id') id: string) {
    return this.videosService.toggleCaseFile(id);
  }

  @Patch(':id/main-delivery')
  toggleMainDelivery(@Param('id') id: string) {
    return this.videosService.toggleMainDelivery(id);
  }

  @Post(':id/create-reference')
  createReference(@Param('id') id: string, @Body() body: { projectId: string }) {
    return this.videosService.createReference(id, body.projectId);
  }
}

