import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SystemResourcesService } from './system-resources.service';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';

/**
 * 系统资源控制器
 * 提供系统公共资源（Logo、默认头像等）的管理接口
 */
@Controller('api/system-resources')
export class SystemResourcesController {
  constructor(private readonly systemResourcesService: SystemResourcesService) {}

  /**
   * 获取常用系统资源URL列表
   * GET /api/system-resources/common
   */
  @Get('common')
  async getCommonResources() {
    const urls = this.systemResourcesService.getCommonResourceUrls();
    return {
      statusCode: HttpStatus.OK,
      data: urls,
    };
  }

  /**
   * 列出指定目录下的所有资源
   * GET /api/system-resources/list/:subPath?
   */
  @Get('list/:subPath?')
  async listResources(@Param('subPath') subPath?: string) {
    try {
      const files = await this.systemResourcesService.listResources(subPath || '');
      return {
        statusCode: HttpStatus.OK,
        data: files.map(file => ({
          name: path.basename(file),
          path: file,
          url: this.systemResourcesService.getResourceUrl(file),
        })),
      };
    } catch (error: any) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message || '获取资源列表失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取资源信息
   * GET /api/system-resources/info/:resourcePath
   */
  @Get('info/:resourcePath(*)')
  async getResourceInfo(@Param('resourcePath') resourcePath: string) {
    try {
      const info = await this.systemResourcesService.getResourceInfo(resourcePath);
      return {
        statusCode: HttpStatus.OK,
        data: info,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message || '获取资源信息失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 上传系统资源文件
   * POST /api/system-resources/upload/:resourcePath
   */
  @Post('upload/:resourcePath(*)')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResource(
    @Param('resourcePath') resourcePath: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: '请选择要上传的文件',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.systemResourcesService.saveResource(resourcePath, file.buffer);
      const url = this.systemResourcesService.getResourceUrl(resourcePath);

      return {
        statusCode: HttpStatus.CREATED,
        message: '资源上传成功',
        data: {
          path: resourcePath,
          url,
          size: file.size,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || '资源上传失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除系统资源文件
   * DELETE /api/system-resources/:resourcePath
   */
  @Delete(':resourcePath(*)')
  async deleteResource(@Param('resourcePath') resourcePath: string) {
    try {
      const exists = await this.systemResourcesService.resourceExists(resourcePath);
      if (!exists) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: '资源不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      await this.systemResourcesService.deleteResource(resourcePath);

      return {
        statusCode: HttpStatus.OK,
        message: '资源删除成功',
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || '资源删除失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 直接访问系统资源文件（通过API）
   * GET /api/system-resources/file/:resourcePath
   */
  @Get('file/:resourcePath(*)')
  async serveResource(
    @Param('resourcePath') resourcePath: string,
    @Res() res: Response,
  ) {
    try {
      const fullPath = this.systemResourcesService.getResourcePath(resourcePath);

      if (!fs.existsSync(fullPath)) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: '资源不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: '不能访问目录',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 根据文件扩展名设置 Content-Type
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年缓存

      const stream = createReadStream(fullPath);
      stream.pipe(res);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || '资源访问失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

