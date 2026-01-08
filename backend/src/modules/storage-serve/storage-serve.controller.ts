import { Controller, Get, Param, Res, HttpStatus, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, existsSync } from 'fs';

/**
 * 静态文件服务控制器
 * 用于提供本地存储的文件访问
 */
@Controller('storage')
export class StorageServeController {
  private storagePath: string;

  constructor(private configService: ConfigService) {
    this.storagePath = this.configService.get<string>(
      'LOCAL_STORAGE_PATH',
      '/www/wwwroot/vioflow_storage'
    );
  }

  /**
   * 提供存储文件访问
   * 支持任意深度的路径，例如：
   * /storage/teams/{team_id}/projects/{project_id}/{video_id}/source.mp4
   */
  @Get('*')
  async serveFile(@Param('0') filePath: string, @Res() res: Response) {
    try {
      // 构建完整的文件路径
      const fullPath = path.join(this.storagePath, filePath);

      // 安全检查：确保路径在存储目录内（防止路径遍历攻击）
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(this.storagePath)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          statusCode: HttpStatus.FORBIDDEN,
          message: '无权访问此路径',
        });
      }

      // 检查文件是否存在
      if (!existsSync(fullPath)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: '文件不存在',
        });
      }

      // 检查是否是文件（而不是目录）
      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: '不能访问目录',
        });
      }

      // 根据文件扩展名设置 Content-Type
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.m4v': 'video/x-m4v',
        '.flv': 'video/x-flv',
        '.wmv': 'video/x-ms-wmv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.json': 'application/json',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      // 支持 Range 请求（用于视频流媒体）
      const range = res.req.headers.range;
      
      if (range) {
        // 解析 Range 头
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunkSize = end - start + 1;

        // 设置响应头
        res.status(HttpStatus.PARTIAL_CONTENT);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Type', contentType);

        // 创建文件流（指定范围）
        const stream = createReadStream(fullPath, { start, end });
        stream.pipe(res);
      } else {
        // 完整文件响应
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Accept-Ranges', 'bytes');

        // 添加缓存控制
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年缓存

        // 创建文件流
        const stream = createReadStream(fullPath);
        stream.pipe(res);
      }
    } catch (error: any) {
      console.error('[StorageServeController] 文件访问错误:', error);
      
      if (!res.headersSent) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '文件访问失败',
          error: error.message,
        });
      }
    }
  }
}











