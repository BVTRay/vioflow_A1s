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
} from '@nestjs/common';
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

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 * 1024 }), // 10GB
        ],
        exceptionFactory: (error) => {
          console.error('[UploadsController] 文件验证失败:', error);
          return error;
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
        throw new Error('文件不能为空');
      }

      if (!req.user?.id) {
        throw new Error('用户未认证');
      }

      // 从 body 中获取参数（multipart/form-data 格式）
      const projectId = body.projectId;
      const name = body.name;
      const version = parseInt(body.version, 10);
      const baseName = body.baseName;
      const changeLog = body.changeLog;

      if (!projectId || !name || !version || !baseName) {
        throw new Error(`缺少必要参数: projectId=${projectId}, name=${name}, version=${version}, baseName=${baseName}`);
      }

      if (isNaN(version)) {
        throw new Error(`版本号无效: ${body.version}`);
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
    } catch (error) {
      console.error('[UploadsController] 上传异常:', error);
      throw error;
    }
  }
}

