import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AnnotationsService } from './annotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from '../queue/queue.service';

@Controller('api/annotations')
export class AnnotationsController {
  constructor(
    private readonly annotationsService: AnnotationsService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('videoId') videoId?: string) {
    return this.annotationsService.findAll(videoId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: { videoId: string; timecode: string; content: string; screenshotUrl?: string }, @Request() req) {
    return this.annotationsService.create({
      ...body,
      userId: req.user.id,
    });
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Param('id') id: string) {
    return this.annotationsService.complete(id);
  }

  @Get('export/:videoId')
  @UseGuards(JwtAuthGuard)
  async exportPdf(@Param('videoId') videoId: string, @Request() req) {
    // 使用异步队列处理PDF导出
    try {
      const job = await this.queueService.addPdfExportJob({
        videoId,
        userId: req.user.id,
      });
      return {
        message: 'PDF导出任务已添加到队列',
        jobId: job.id,
        status: 'processing',
      };
    } catch (error: any) {
      // 如果队列服务不可用，回退到同步处理
      console.warn('[AnnotationsController] 队列服务不可用，使用同步处理:', error.message);
      return this.annotationsService.exportPdf(videoId);
    }
  }

  @Get('download/:filename')
  async downloadPdf(@Param('filename') filename: string, @Res() res: Response) {
    const { filepath, exists } = await this.annotationsService.getExportFile(filename);
    
    if (!exists) {
      throw new NotFoundException('文件不存在');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.sendFile(filepath);
  }
}

