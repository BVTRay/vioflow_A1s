import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('test-supabase')
  async testSupabase(@Request() req) {
    console.log('[UploadsController] 测试 Supabase 连接，用户:', req.user?.id);
    return this.uploadsService.testSupabaseConnection();
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'upload',
    };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 上传接口：1分钟内最多10次
  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }), // 500MB
        ],
        exceptionFactory: (error: any) => {
          console.error('[UploadsController] 文件验证失败:', error);
          return new BadRequestException(`文件验证失败: ${error?.message || error || '未知错误'}`);
        },
      }),
    )
    file: Express.Multer.File,
    @Body() body: any,
    @Request() req,
  ) {
    try {
      console.log('[UploadsController] 收到上传请求:', {
        filename: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype,
        body,
        userId: req.user?.id,
      });

      if (!file) {
        throw new BadRequestException('文件不能为空');
      }

      if (!req.user?.id) {
        throw new BadRequestException('用户未认证');
      }

      // 从 body 中获取参数（multipart/form-data 格式）
      const projectId = body.projectId;
      const name = body.name;
      const version = parseInt(body.version, 10);
      const baseName = body.baseName;
      const changeLog = body.changeLog;

      if (!projectId || !name || !version || !baseName) {
        throw new BadRequestException(`缺少必要参数: projectId=${projectId}, name=${name}, version=${version}, baseName=${baseName}`);
      }

      if (isNaN(version)) {
        throw new BadRequestException(`版本号无效: ${body.version}`);
      }

      console.log('[UploadsController] 调用上传服务...');
      const result = await this.uploadsService.uploadVideo(
        file,
        req.user.id,
        projectId,
        name,
        version,
        baseName,
        changeLog,
      );

      console.log('[UploadsController] 上传成功:', result.id);
      return result;
    } catch (error: any) {
      console.error('[UploadsController] 上传异常:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        response: error?.response,
      });
      
      // 如果已经是 HttpException，直接抛出
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 否则转换为 InternalServerErrorException
      throw new InternalServerErrorException(
        error?.message || '上传失败，请稍后重试'
      );
    }
  }
}

