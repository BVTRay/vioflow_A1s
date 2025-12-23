import { Injectable, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UploadTask, UploadStatus } from './entities/upload-task.entity';
import { IStorageService } from '../../common/storage/storage.interface';
import { VideosService } from '../videos/videos.service';
import { VideoType, VideoStatus, StorageTier, AspectRatio } from '../videos/entities/video.entity';
import { ThumbnailService } from '../../common/video/thumbnail.service';
import { StorageService } from '../storage/storage.service';
import { ProjectsService } from '../projects/projects.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadTask)
    private uploadTaskRepository: Repository<UploadTask>,
    @Inject('IStorageService')
    private storageService: IStorageService,
    private videosService: VideosService,
    private thumbnailService: ThumbnailService,
    @Inject(forwardRef(() => StorageService))
    private storageStatsService: StorageService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    private queueService: QueueService,
    private configService: ConfigService,
  ) {}

  async createTask(userId: string, projectId: string, filename: string, totalSize: number): Promise<UploadTask> {
    const task = this.uploadTaskRepository.create({
      user_id: userId,
      project_id: projectId,
      filename,
      total_size: totalSize,
      uploaded_size: 0,
      status: UploadStatus.PENDING,
    });
    return this.uploadTaskRepository.save(task);
  }

  async updateProgress(taskId: string, uploadedSize: number): Promise<void> {
    await this.uploadTaskRepository.update(taskId, {
      uploaded_size: uploadedSize,
      status: UploadStatus.UPLOADING,
    });
  }

  async completeTask(taskId: string, storageKey: string): Promise<void> {
    await this.uploadTaskRepository.update(taskId, {
      status: UploadStatus.COMPLETED,
      storage_key: storageKey,
    });
  }

  async findAll(userId: string): Promise<UploadTask[]> {
    return this.uploadTaskRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async testStorageConnection() {
    try {
      // 检查存储服务类型
      const storageType = process.env.STORAGE_TYPE || 
        (process.env.R2_ACCESS_KEY_ID ? 'r2' : 'supabase');
      
      // 测试上传文件
      const testPath = `test/connection-test-${Date.now()}.txt`;
      const testContent = Buffer.from('Storage connection test');
      
      console.log('[UploadsService] 开始测试存储连接...', { storageType });
      
      const result = await this.storageService.uploadFile(testContent, testPath, 'text/plain');
      console.log('[UploadsService] 存储连接测试成功:', result);
      
      // 清理测试文件
      try {
        await this.storageService.deleteFile(testPath);
        console.log('[UploadsService] 测试文件已清理');
      } catch (e) {
        console.warn('[UploadsService] 清理测试文件失败（可忽略）:', e);
      }
      
      return {
        success: true,
        message: `${storageType === 'r2' ? 'R2' : 'Supabase'} 连接正常`,
        storageType,
        details: {
          testFileUrl: result.url,
          testFileKey: result.key,
        },
      };
    } catch (error: any) {
      console.error('[UploadsService] 存储连接测试失败:', error);
      const storageType = process.env.STORAGE_TYPE || 
        (process.env.R2_ACCESS_KEY_ID ? 'r2' : 'supabase');
      
      return {
        success: false,
        message: error.message || '存储连接失败',
        storageType,
        error: error.toString(),
        stack: error.stack,
        checkList: {
          storageType,
          hasR2Config: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT),
          hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
        },
      };
    }
  }

  // 保持向后兼容
  async testSupabaseConnection() {
    return this.testStorageConnection();
  }

  async uploadVideo(
    file: Express.Multer.File,
    userId: string,
    projectId: string,
    name: string,
    version: number,
    baseName: string,
    changeLog?: string,
  ) {
    try {
      console.log(`[UploadsService] 开始上传视频:`, {
        filename: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype,
        hasBuffer: !!file?.buffer,
        bufferLength: file?.buffer?.length,
        projectId,
        name,
        version,
        baseName,
      });

      // 验证文件对象
      if (!file) {
        throw new BadRequestException('文件对象为空');
      }

      if (!file.buffer) {
        console.error('[UploadsService] 文件缓冲区为空，文件信息:', {
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          fieldname: file.fieldname,
        });
        throw new BadRequestException('文件缓冲区为空，可能是文件上传过程中出现问题');
      }

      // 文件类型白名单验证
      const allowedMimeTypes = [
        // 视频格式
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        'video/webm', 'video/x-m4v', 'video/x-flv', 'video/x-ms-wmv',
        // 图片格式
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
        // 音频格式
        'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
        'audio/x-aac', 'audio/flac',
      ];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`不支持的文件类型: ${file.mimetype}。仅支持视频、图片和音频文件。`);
      }

      // 检查文件扩展名（双重验证）
      const fileExtensionFromOriginal = file.originalname.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff',
        'mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac'];
      
      if (!fileExtensionFromOriginal || !allowedExtensions.includes(fileExtensionFromOriginal)) {
        throw new BadRequestException(`不支持的文件扩展名: ${fileExtensionFromOriginal}`);
      }

      // 检查存储配额（基于团队）
      try {
        const project = await this.projectsService.findOne(projectId);
        if (project && project.team_id) {
          const storageUsage = await this.storageStatsService.getUsage(project.team_id, userId);
          // 从环境变量读取存储配额限制，默认值根据存储类型设置
          // R2 通常有更大的存储空间，默认 1TB；Supabase 默认 100GB
          const storageType = this.configService.get<string>('STORAGE_TYPE', 'supabase');
          const defaultMaxStorage = storageType === 'r2' 
            ? 1024 * 1024 * 1024 * 1024  // 1TB for R2
            : 100 * 1024 * 1024 * 1024;  // 100GB for Supabase
          
          // 从环境变量读取，如果没有则使用默认值
          const maxStorageGB = this.configService.get<string>('MAX_STORAGE_GB');
          const maxStorage = maxStorageGB 
            ? parseInt(maxStorageGB, 10) * 1024 * 1024 * 1024 
            : defaultMaxStorage;
          
          // 确保 total_size 是数字类型（可能是字符串）
          const currentSize = Number(storageUsage.total_size) || 0;
          const fileSizeBytes = Number(file.size) || 0;
          const newSize = currentSize + fileSizeBytes;
          
          console.log('[UploadsService] 存储配额检查:', {
            storageType,
            maxStorageGB,
            maxStorage: `${(maxStorage / 1024 / 1024 / 1024).toFixed(2)}GB`,
            currentSizeBytes: currentSize,
            currentSizeGB: `${(currentSize / 1024 / 1024 / 1024).toFixed(2)}GB`,
            fileSizeBytes: fileSizeBytes,
            fileSizeGB: `${(fileSizeBytes / 1024 / 1024 / 1024).toFixed(2)}GB`,
            newSizeBytes: newSize,
            newSizeGB: `${(newSize / 1024 / 1024 / 1024).toFixed(2)}GB`,
            maxStorageBytes: maxStorage,
            willExceed: newSize > maxStorage,
          });
          
          if (newSize > maxStorage) {
            throw new BadRequestException(
              `存储配额不足。当前使用: ${(currentSize / 1024 / 1024 / 1024).toFixed(2)}GB，` +
              `上传后将超过限制: ${(maxStorage / 1024 / 1024 / 1024).toFixed(2)}GB`
            );
          }
        }
      } catch (quotaError: any) {
        if (quotaError instanceof BadRequestException) {
          throw quotaError;
        }
        console.warn('[UploadsService] 配额检查失败，继续上传:', quotaError.message);
      }

      // 1. 上传文件到存储服务
      // 生成一个安全的文件名：使用时间戳 + 随机字符串 + 扩展名
      const timestamp = Date.now();
      // 使用已验证的文件扩展名，如果没有则从name获取，最后回退到mp4
      const fileExtension = fileExtensionFromOriginal || name.split('.').pop() || 'mp4';
      // 生成一个唯一的文件名（只包含 ASCII 字符）
      const randomStr = Math.random().toString(36).substring(2, 10);
      const safeFileName = `${timestamp}-${randomStr}.${fileExtension}`;
      // 存储路径：videos/{projectId}/{filename}
      const storagePath = `videos/${projectId}/${safeFileName}`;

      console.log(`[UploadsService] 上传到 Supabase: ${storagePath} (原始文件名: ${name})`);

      let url: string;
      let key: string;
      
      try {
        const uploadResult = await this.storageService.uploadFile(
          file.buffer,
          storagePath,
          file.mimetype || 'video/mp4',
        );
        url = uploadResult.url;
        key = uploadResult.key;
        console.log(`[UploadsService] 文件上传成功: ${url}, key: ${key}`);
      } catch (uploadError: any) {
        console.error('[UploadsService] Supabase 上传失败:', {
          message: uploadError?.message,
          stack: uploadError?.stack,
          error: uploadError,
        });
        throw new InternalServerErrorException(`文件上传到存储失败: ${uploadError?.message || '未知错误'}`);
      }

      // 2. 检测视频类型
      let videoType = VideoType.VIDEO;
      if (file.mimetype) {
        if (file.mimetype.startsWith('image/')) {
          videoType = VideoType.IMAGE;
        } else if (file.mimetype.startsWith('audio/')) {
          videoType = VideoType.AUDIO;
        }
      }

      // 3. 如果是视频文件，生成缩略图并获取视频信息
      let thumbnailUrl: string | undefined = undefined;
      let duration: number | undefined = undefined;
      let resolution: string | undefined = undefined;
      let aspectRatio: AspectRatio | undefined = undefined;

      // 3. 如果是视频文件，尝试快速获取基本信息（不生成缩略图）
      // 缩略图生成将异步进行，不阻塞上传流程
      if (videoType === VideoType.VIDEO && file.buffer) {
        console.log(`[UploadsService] 开始获取视频基本信息...`);
        try {
          // 快速获取视频信息（不生成缩略图）
          const videoInfo = await this.thumbnailService.getVideoInfoFromBuffer(file.buffer);
          duration = videoInfo.duration;
          if (videoInfo.width && videoInfo.height) {
            resolution = `${videoInfo.width}x${videoInfo.height}`;
            aspectRatio = videoInfo.width >= videoInfo.height 
              ? AspectRatio.LANDSCAPE 
              : AspectRatio.PORTRAIT;
          }
          console.log(`[UploadsService] 视频信息获取成功: 时长: ${duration}s, 分辨率: ${resolution}`);
        } catch (infoError) {
          console.error(`[UploadsService] 获取视频信息失败:`, infoError);
          // 信息获取失败不影响上传
        }
      }

      // 4. 创建视频记录
      // 将 duration 转换为整数（秒数），因为数据库字段是 integer 类型
      const durationInSeconds = duration ? Math.round(duration) : undefined;
      
      console.log(`[UploadsService] 创建视频记录...`, {
        projectId,
        name,
        originalFilename: file.originalname,
        baseName,
        version,
        storageUrl: url?.substring(0, 100) + '...',
        storageKey: key?.substring(0, 100) + '...',
        storageUrlLength: url?.length,
        storageKeyLength: key?.length,
        duration: duration,
        durationInSeconds: durationInSeconds,
      });

      // 检查字段长度限制
      if (url && url.length > 500) {
        console.error(`[UploadsService] storage_url 长度超过限制: ${url.length} > 500`);
        throw new InternalServerErrorException(`存储URL过长 (${url.length} 字符)，最大允许 500 字符`);
      }
      if (key && key.length > 500) {
        console.error(`[UploadsService] storage_key 长度超过限制: ${key.length} > 500`);
        throw new InternalServerErrorException(`存储Key过长 (${key.length} 字符)，最大允许 500 字符`);
      }

      try {
        const video = await this.videosService.create({
          projectId,
          name,
          originalFilename: file.originalname,
          baseName,
          version,
          type: videoType,
          storageUrl: url,
          storageKey: key,
          storageTier: StorageTier.STANDARD,
          size: file.size,
          uploaderId: userId,
          changeLog: changeLog || '上传新文件',
          thumbnailUrl,
          duration: durationInSeconds,
          resolution,
          aspectRatio,
        });

        console.log(`[UploadsService] 视频记录创建成功: ${video.id}`);
        
        // 如果是视频文件且还没有缩略图，将缩略图生成任务添加到异步队列
        if (videoType === VideoType.VIDEO && !thumbnailUrl && video.id) {
          try {
            // 将缩略图生成任务添加到队列（队列处理器会从存储中读取视频文件）
            await this.queueService.addThumbnailJob({
              videoId: video.id,
              videoKey: key,
            });
            console.log(`[UploadsService] 缩略图生成任务已添加到队列: videoId=${video.id}, videoKey=${key}`);
          } catch (queueError) {
            console.error(`[UploadsService] 添加缩略图任务到队列失败:`, queueError);
            // 队列失败不影响上传成功
          }
        }
        
        return video;
      } catch (dbError: any) {
        console.error('[UploadsService] 数据库保存失败:', {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          constraint: dbError.constraint,
          stack: dbError.stack,
        });
        
        // 处理 PostgreSQL 错误代码
        let errorMessage = `保存视频记录失败: ${dbError.message || dbError.detail || '未知错误'}`;
        if (dbError.code === '23503') {
          errorMessage = '项目不存在或已被删除';
        } else if (dbError.code === '23505') {
          errorMessage = '视频记录已存在（可能是重复上传）';
        } else if (dbError.code === '23502') {
          errorMessage = '缺少必要的字段';
        } else if (dbError.code === '22001') {
          errorMessage = '字段值过长，超过数据库限制';
        }
        
        throw new InternalServerErrorException(errorMessage);
      }
    } catch (error: any) {
      console.error('[UploadsService] 上传失败:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
      });
      
      // 如果已经是 HttpException，直接抛出
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // 否则转换为 InternalServerErrorException
      throw new InternalServerErrorException(
        error?.message || '上传失败，请稍后重试'
      );
    }
  }
}

