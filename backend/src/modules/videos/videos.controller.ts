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
  BadRequestException,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BatchTagDto } from './dto/batch-tag.dto';

@Controller('api/videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('admin/all')
  findAllForAdmin(
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    console.log('[VideosController] 收到管理员获取所有视频请求:', { includeDeleted });
    return this.videosService.findAllForAdmin(includeDeleted === 'true');
  }

  @Get('check-asset-name')
  checkAssetName(
    @Query('baseName') baseName: string,
    @Query('teamId') teamId?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    const finalTeamId = teamId || headerTeamId;
    if (!finalTeamId) {
      throw new BadRequestException('需要提供 teamId');
    }
    if (!baseName) {
      throw new BadRequestException('需要提供 baseName');
    }
    return this.videosService.checkAssetNameUnique(baseName, finalTeamId);
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('isCaseFile') isCaseFile?: string,
    @Query('tags') tags?: string,
    @Query('teamId') teamId?: string,
    @Query('includeRelations') includeRelations?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头
    const finalTeamId = teamId || headerTeamId;
    return this.videosService.findAll({
      projectId,
      isCaseFile: isCaseFile === 'true' ? true : isCaseFile === 'false' ? false : undefined,
      tags: tags ? tags.split(',') : undefined,
      teamId: finalTeamId,
      includeRelations: includeRelations === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  // 回收站相关接口 - 必须在所有 :id 路由之前定义，避免路由冲突
  @Get('trash/list')
  async getDeletedVideos(
    @Headers('x-team-id') teamId?: string,
    @Query('teamId') queryTeamId?: string,
  ) {
    const finalTeamId = queryTeamId || teamId;
    if (!finalTeamId) {
      throw new BadRequestException('需要提供 teamId');
    }
    return this.videosService.getDeletedVideos(finalTeamId);
  }

  @Post('trash/cleanup')
  async cleanupOldDeletedVideos() {
    const count = await this.videosService.cleanupOldDeletedVideos();
    return { message: `已清理 ${count} 个30天前删除的视频`, count };
  }

  @Post('trash/:id/restore')
  async restoreVideo(@Param('id') id: string) {
    const video = await this.videosService.restoreVideo(id);
    return { message: '视频已恢复', video };
  }

  @Delete('trash/:id/permanent')
  async permanentlyDeleteVideo(@Param('id') id: string) {
    await this.videosService.permanentlyDeleteVersion(id);
    return { message: '视频已彻底删除' };
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: {
    name?: string;
    baseName?: string;
    version?: number;
    changeLog?: string;
  }) {
    return this.videosService.update(id, body);
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
    try {
      console.log('[VideosController] 收到删除请求:', { id, deleteAllVersions });
      const video = await this.videosService.findOne(id);
      const shouldDeleteAll = deleteAllVersions === 'true';
      
      if (shouldDeleteAll) {
        // 软删除所有版本
        await this.videosService.deleteAllVersions(video.project_id, video.base_name);
        return { message: '所有版本已删除' };
      } else {
        // 只软删除当前版本
        await this.videosService.deleteVersion(id);
        return { message: '视频版本已删除' };
      }
    } catch (error: any) {
      console.error('[VideosController] 删除视频失败:', {
        id,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
      });
      throw error;
    }
  }
}
