import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'video-thumbnails');

  constructor(private readonly storageService: SupabaseStorageService) {
    // 确保临时目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 从视频文件中生成缩略图
   * @param videoBuffer 视频文件的 Buffer
   * @param videoKey 视频在存储中的 key（用于生成缩略图路径）
   * @param timestamp 提取的时间点（秒），默认提取视频的 10% 位置或第 1 秒
   * @returns 缩略图的 URL 和 key
   */
  async generateThumbnail(
    videoBuffer: Buffer,
    videoKey: string,
    timestamp?: number,
  ): Promise<{ url: string; key: string } | null> {
    const tempVideoPath = path.join(this.tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);
    const tempThumbnailPath = path.join(this.tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

    try {
      // 1. 将视频 Buffer 写入临时文件
      this.logger.log(`[ThumbnailService] 写入临时视频文件: ${tempVideoPath}`);
      fs.writeFileSync(tempVideoPath, videoBuffer);

      // 2. 获取视频信息（时长等）
      const videoInfo = await this.getVideoInfo(tempVideoPath);
      this.logger.log(`[ThumbnailService] 视频信息:`, videoInfo);

      // 3. 确定提取时间点
      const extractTime = timestamp !== undefined 
        ? timestamp 
        : Math.max(1, Math.floor((videoInfo.duration || 10) * 0.1)); // 提取 10% 位置或第 1 秒

      this.logger.log(`[ThumbnailService] 从视频第 ${extractTime} 秒提取缩略图`);

      // 4. 使用 ffmpeg 提取帧
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: [extractTime],
            filename: path.basename(tempThumbnailPath),
            folder: path.dirname(tempThumbnailPath),
            size: '400x?', // 宽度 400px，高度按比例
          })
          .on('end', () => {
            this.logger.log(`[ThumbnailService] 缩略图提取成功: ${tempThumbnailPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`[ThumbnailService] FFmpeg 错误:`, err);
            reject(err);
          });
      });

      // 5. 读取生成的缩略图
      if (!fs.existsSync(tempThumbnailPath)) {
        throw new Error('缩略图文件未生成');
      }

      const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
      this.logger.log(`[ThumbnailService] 缩略图大小: ${thumbnailBuffer.length} bytes`);

      // 6. 生成缩略图的存储路径
      // 从视频 key 生成缩略图 key: projectId/timestamp-filename.mp4 -> thumbnails/projectId/timestamp-filename.jpg
      // 如果 key 包含 videos/ 前缀，则替换为 thumbnails/，否则添加 thumbnails/ 前缀
      let thumbnailKey = videoKey;
      if (thumbnailKey.startsWith('videos/')) {
        thumbnailKey = thumbnailKey.replace(/^videos\//, 'thumbnails/');
      } else {
        // 提取项目ID和文件名部分
        const parts = thumbnailKey.split('/');
        if (parts.length >= 2) {
          thumbnailKey = `thumbnails/${parts.slice(0, -1).join('/')}/${parts[parts.length - 1]}`;
        } else {
          thumbnailKey = `thumbnails/${thumbnailKey}`;
        }
      }
      // 替换文件扩展名为 .jpg
      thumbnailKey = thumbnailKey.replace(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i, '.jpg');

      // 7. 上传缩略图到 Supabase
      this.logger.log(`[ThumbnailService] 上传缩略图到 Supabase: ${thumbnailKey}`);
      const { url, key } = await this.storageService.uploadFile(
        thumbnailBuffer,
        thumbnailKey,
        'image/jpeg',
      );

      this.logger.log(`[ThumbnailService] 缩略图上传成功: ${url}`);

      return { url, key };
    } catch (error) {
      this.logger.error(`[ThumbnailService] 生成缩略图失败:`, error);
      return null;
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
        if (fs.existsSync(tempThumbnailPath)) {
          fs.unlinkSync(tempThumbnailPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`[ThumbnailService] 清理临时文件失败:`, cleanupError);
      }
    }
  }

  /**
   * 获取视频信息（时长、分辨率等）
   */
  private async getVideoInfo(videoPath: string): Promise<{ duration: number; width?: number; height?: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          this.logger.warn(`[ThumbnailService] 无法获取视频信息:`, err);
          resolve({ duration: 10 }); // 默认值
          return;
        }

        const videoStream = metadata.streams?.find(s => s.codec_type === 'video');
        const duration = metadata.format?.duration || 10;

        resolve({
          duration,
          width: videoStream?.width,
          height: videoStream?.height,
        });
      });
    });
  }
}

