import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadTask, UploadStatus } from './entities/upload-task.entity';
import { SupabaseStorageService } from '../../common/storage/supabase-storage.service';
import { VideosService } from '../videos/videos.service';
import { VideoType, VideoStatus, StorageTier, AspectRatio } from '../videos/entities/video.entity';
import { ThumbnailService } from '../../common/video/thumbnail.service';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadTask)
    private uploadTaskRepository: Repository<UploadTask>,
    private storageService: SupabaseStorageService,
    private videosService: VideosService,
    private thumbnailService: ThumbnailService,
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

  async testSupabaseConnection() {
    try {
      // 检查 Supabase 服务是否已初始化
      const storageService = this.storageService as any;
      if (!storageService.supabase) {
        return {
          success: false,
          message: 'Supabase 未配置',
          details: '请检查环境变量：SUPABASE_URL 和 SUPABASE_SERVICE_KEY',
          checkList: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
            bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'videos',
          },
        };
      }

      // 测试上传文件
      const testPath = `test/connection-test-${Date.now()}.txt`;
      const testContent = Buffer.from('Supabase connection test');
      
      console.log('[UploadsService] 开始测试 Supabase 连接...');
      console.log('[UploadsService] 配置信息:', {
        bucket: storageService.bucketName,
        hasSupabase: !!storageService.supabase,
      });
      
      const result = await this.storageService.uploadFile(testContent, testPath, 'text/plain');
      console.log('[UploadsService] Supabase 连接测试成功:', result);
      
      // 清理测试文件
      try {
        await this.storageService.deleteFile(testPath);
        console.log('[UploadsService] 测试文件已清理');
      } catch (e) {
        console.warn('[UploadsService] 清理测试文件失败（可忽略）:', e);
      }
      
      return {
        success: true,
        message: 'Supabase 连接正常',
        details: {
          bucket: storageService.bucketName,
          testFileUrl: result.url,
          testFileKey: result.key,
        },
      };
    } catch (error: any) {
      console.error('[UploadsService] Supabase 连接测试失败:', error);
      return {
        success: false,
        message: error.message || 'Supabase 连接失败',
        error: error.toString(),
        stack: error.stack,
        checkList: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
          bucketName: process.env.SUPABASE_STORAGE_BUCKET || 'videos',
        },
      };
    }
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
        filename: file.originalname,
        size: file.size,
        projectId,
        name,
        version,
        baseName,
      });

      // 1. 上传文件到 Supabase Storage
      // Supabase Storage 的 key 只能包含 ASCII 字符，不能包含中文字符
      // 生成一个安全的文件名：使用时间戳 + 随机字符串 + 扩展名
      const timestamp = Date.now();
      const fileExtension = name.split('.').pop() || 'mp4';
      // 生成一个唯一的文件名（只包含 ASCII 字符）
      const randomStr = Math.random().toString(36).substring(2, 10);
      const safeFileName = `${timestamp}-${randomStr}.${fileExtension}`;
      const storagePath = `${projectId}/${safeFileName}`;

      console.log(`[UploadsService] 上传到 Supabase: ${storagePath} (原始文件名: ${name})`);

      if (!file.buffer) {
        throw new Error('文件缓冲区为空');
      }

      const { url, key } = await this.storageService.uploadFile(
        file.buffer,
        storagePath,
        file.mimetype || 'video/mp4',
      );

      console.log(`[UploadsService] 文件上传成功: ${url}, key: ${key}`);

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

      if (videoType === VideoType.VIDEO && file.buffer) {
        console.log(`[UploadsService] 开始生成缩略图并获取视频信息...`);
        try {
          const thumbnailResult = await this.thumbnailService.generateThumbnail(
            file.buffer,
            key,
          );
          if (thumbnailResult) {
            thumbnailUrl = thumbnailResult.url;
            duration = thumbnailResult.duration;
            
            // 计算分辨率和宽高比
            if (thumbnailResult.width && thumbnailResult.height) {
              resolution = `${thumbnailResult.width}x${thumbnailResult.height}`;
              aspectRatio = thumbnailResult.width >= thumbnailResult.height 
                ? AspectRatio.LANDSCAPE 
                : AspectRatio.PORTRAIT;
            }
            
            console.log(`[UploadsService] 缩略图生成成功: ${thumbnailUrl}, 时长: ${duration}s, 分辨率: ${resolution}`);
          } else {
            console.warn(`[UploadsService] 缩略图生成失败，尝试单独获取视频信息...`);
            // 缩略图生成失败，尝试单独获取视频信息
            try {
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
            }
          }
        } catch (thumbnailError) {
          console.error(`[UploadsService] 缩略图生成异常:`, thumbnailError);
          // 缩略图生成失败不影响视频上传，尝试单独获取视频信息
          try {
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
          }
        }
      }

      // 4. 创建视频记录
      console.log(`[UploadsService] 创建视频记录...`);
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
        duration,
        resolution,
        aspectRatio,
      });

      console.log(`[UploadsService] 视频记录创建成功: ${video.id}`);
      return video;
    } catch (error) {
      console.error('[UploadsService] 上传失败:', error);
      throw error;
    }
  }
}

