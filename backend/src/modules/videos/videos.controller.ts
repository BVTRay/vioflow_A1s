import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BatchTagDto } from './dto/batch-tag.dto';

@Controller('api/videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('isCaseFile') isCaseFile?: string,
    @Query('tags') tags?: string,
  ) {
    return this.videosService.findAll({
      projectId,
      isCaseFile: isCaseFile === 'true' ? true : isCaseFile === 'false' ? false : undefined,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }

  @Get(':projectId/versions/:baseName')
  getVersions(@Param('projectId') projectId: string, @Param('baseName') baseName: string) {
    return this.videosService.getVersions(projectId, baseName);
  }

  @Post(':id/reference')
  createReference(@Param('id') id: string, @Body() body: { projectId: string }) {
    return this.videosService.createReference(id, body.projectId);
  }

  @Patch(':id/tags')
  updateTags(@Param('id') id: string, @Body() body: { tagIds: string[] }) {
    return this.videosService.updateTags(id, body.tagIds);
  }

  @Post('batch-tag')
  batchTag(@Body() batchTagDto: BatchTagDto) {
    return this.videosService.batchTag(batchTagDto.videoIds, batchTagDto.tagIds);
  }

  @Patch(':id/toggle-case-file')
  toggleCaseFile(@Param('id') id: string) {
    return this.videosService.toggleCaseFile(id);
  }

  @Patch(':id/toggle-main-delivery')
  toggleMainDelivery(@Param('id') id: string) {
    return this.videosService.toggleMainDelivery(id);
  }
}
