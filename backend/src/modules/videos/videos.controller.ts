import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  Query,
  Headers,
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
    @Query('teamId') teamId?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头
    const finalTeamId = teamId || headerTeamId;
    return this.videosService.findAll({
      projectId,
      isCaseFile: isCaseFile === 'true' ? true : isCaseFile === 'false' ? false : undefined,
      tags: tags ? tags.split(',') : undefined,
      teamId: finalTeamId,
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

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: 'initial' | 'annotated' | 'approved' }) {
    return this.videosService.updateStatus(id, body.status);
  }

  @Get(':id/playback-url')
  getPlaybackUrl(@Param('id') id: string, @Query('signed') signed?: string) {
    const useSignedUrl = signed !== 'false'; // 默认使用签名URL
    return this.videosService.getPlaybackUrl(id, useSignedUrl).then(url => ({ url }));
  }

  @Delete(':id')
  async deleteVideo(
    @Param('id') id: string,
    @Query('deleteAllVersions') deleteAllVersions?: string,
  ) {
    const video = await this.videosService.findOne(id);
    const shouldDeleteAll = deleteAllVersions === 'true';
    
    if (shouldDeleteAll) {
      // 删除所有版本
      await this.videosService.deleteAllVersions(video.project_id, video.base_name);
      return { message: '所有版本已删除' };
    } else {
      // 只删除当前版本
      await this.videosService.deleteVersion(id);
      return { message: '视频版本已删除' };
    }
  }
}
