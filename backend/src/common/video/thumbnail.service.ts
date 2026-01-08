import { Injectable, Logger, Inject } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IStorageService } from '../storage/storage.interface';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'video-thumbnails');
  private readonly fsPromises = fs.promises;
  private readonly defaultMaxSeekSeconds = 10;

  constructor(
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {
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
  ): Promise<{ url: string; key: string; duration?: number; width?: number; height?: number } | null> {
    const tempVideoPath = path.join(this.tempDir, `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);
    const tempThumbnailPath = path.join(this.tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

    try {
      // 1. 将视频 Buffer 写入临时文件
      this.logger.log(`[ThumbnailService] 写入临时视频文件: ${tempVideoPath}`);
      await this.fsPromises.writeFile(tempVideoPath, videoBuffer);

      // 2. 获取视频信息（时长等）
      const videoInfo = await this.getVideoInfo(tempVideoPath);
      this.logger.log(`[ThumbnailService] 视频信息:`, videoInfo);

      // 3. 确定提取时间点
      const extractTime = this.computeExtractTime(videoInfo.duration, timestamp);

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

      const thumbnailBuffer = await this.fsPromises.readFile(tempThumbnailPath);
      this.logger.log(`[ThumbnailService] 缩略图大小: ${thumbnailBuffer.length} bytes`);

      // 6. 生成缩略图的存储路径
      // 按照设计方案：将 source.{ext} 替换为 thumb_200x.jpg
      // 路径格式：teams/{team_id}/projects/{project_id}/{video_id}/thumb_200x.jpg
      let thumbnailKey = videoKey;
      
      // 如果是新格式路径（teams/.../{video_id}/source.ext）
      if (thumbnailKey.includes('/source.')) {
        // 直接替换 source.{ext} 为 thumb_200x.jpg
        thumbnailKey = thumbnailKey.replace(/\/source\.[^/]+$/, '/thumb_200x.jpg');
      } else {
        // 兼容旧格式路径
        if (thumbnailKey.startsWith('videos/')) {
          thumbnailKey = thumbnailKey.replace(/^videos\//, 'thumbnails/');
        } else {
          const parts = thumbnailKey.split('/');
          if (parts.length >= 2) {
            thumbnailKey = `thumbnails/${parts.slice(0, -1).join('/')}/${parts[parts.length - 1]}`;
          } else {
            thumbnailKey = `thumbnails/${thumbnailKey}`;
          }
        }
        // 替换文件扩展名为 .jpg
        thumbnailKey = thumbnailKey.replace(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i, '.jpg');
      }

      // 7. 上传缩略图到存储
      this.logger.log(`[ThumbnailService] 上传缩略图到存储: ${thumbnailKey}`);
      const { url, key } = await this.storageService.uploadFile(
        thumbnailBuffer,
        thumbnailKey,
        'image/jpeg',
      );

      this.logger.log(`[ThumbnailService] 缩略图上传成功: ${url}`);

      return { 
        url, 
        key,
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
      };
    } catch (error) {
      this.logger.error(`[ThumbnailService] 生成缩略图失败:`, error);
      return null;
    } finally {
      // 清理临时文件
      try {
        if (fs.existsSync(tempVideoPath)) {
          await this.fsPromises.unlink(tempVideoPath);
        }
        if (fs.existsSync(tempThumbnailPath)) {
          await this.fsPromises.unlink(tempThumbnailPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`[ThumbnailService] 清理临时文件失败:`, cleanupError);
      }
    }
  }

  /**
   * 从视频 URL 直接生成缩略图（避免先下载整段视频到内存）
   * @param videoUrl 可访问的视频URL（建议为签名URL或内部可访问的公共URL）
   * @param videoKey 视频在存储中的 key（用于生成缩略图路径）
   * @param timestamp 提取的时间点（秒）
   */
  async generateThumbnailFromUrl(
    videoUrl: string,
    videoKey: string,
    timestamp?: number,
  ): Promise<{ url: string; key: string; duration?: number; width?: number; height?: number } | null> {
    const tempThumbnailPath = path.join(this.tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

    try {
      // 1) 获取视频信息（时长/分辨率）- ffprobe 支持 URL
      const videoInfo = await this.getVideoInfo(videoUrl);
      this.logger.log(`[ThumbnailService] (URL) 视频信息:`, videoInfo);

      // 2) 确定提取时间点（同 Buffer 路径）
      const extractTime = this.computeExtractTime(videoInfo.duration, timestamp);

      this.logger.log(`[ThumbnailService] (URL) 从视频第 ${extractTime} 秒提取缩略图`);

      // 3) 直接从 URL 取帧：-ss 放在 input 侧通常更快（接近关键帧）
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoUrl)
          .inputOptions([`-ss ${extractTime}`])
          .outputOptions([
            '-frames:v 1',
            '-q:v 2',
            '-an',
            '-sn',
            '-dn',
            '-vf scale=400:-1',
          ])
          .output(tempThumbnailPath)
          .on('end', () => {
            this.logger.log(`[ThumbnailService] (URL) 缩略图提取成功: ${tempThumbnailPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`[ThumbnailService] (URL) FFmpeg 错误:`, err);
            reject(err);
          })
          .run();
      });

      if (!fs.existsSync(tempThumbnailPath)) {
        throw new Error('缩略图文件未生成');
      }

      const thumbnailBuffer = await this.fsPromises.readFile(tempThumbnailPath);
      this.logger.log(`[ThumbnailService] (URL) 缩略图大小: ${thumbnailBuffer.length} bytes`);

      // 4) 生成缩略图存储路径（复用同逻辑）
      let thumbnailKey = videoKey;
      if (thumbnailKey.includes('/source.')) {
        thumbnailKey = thumbnailKey.replace(/\/source\.[^/]+$/, '/thumb_200x.jpg');
      } else {
        if (thumbnailKey.startsWith('videos/')) {
          thumbnailKey = thumbnailKey.replace(/^videos\//, 'thumbnails/');
        } else {
          const parts = thumbnailKey.split('/');
          if (parts.length >= 2) {
            thumbnailKey = `thumbnails/${parts.slice(0, -1).join('/')}/${parts[parts.length - 1]}`;
          } else {
            thumbnailKey = `thumbnails/${thumbnailKey}`;
          }
        }
        thumbnailKey = thumbnailKey.replace(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i, '.jpg');
      }

      this.logger.log(`[ThumbnailService] (URL) 上传缩略图到存储: ${thumbnailKey}`);
      const { url, key } = await this.storageService.uploadFile(thumbnailBuffer, thumbnailKey, 'image/jpeg');
      this.logger.log(`[ThumbnailService] (URL) 缩略图上传成功: ${url}`);

      return {
        url,
        key,
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
      };
    } catch (error) {
      this.logger.error(`[ThumbnailService] (URL) 生成缩略图失败:`, error);
      return null;
    } finally {
      try {
        if (fs.existsSync(tempThumbnailPath)) {
          await this.fsPromises.unlink(tempThumbnailPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`[ThumbnailService] (URL) 清理临时文件失败:`, cleanupError);
      }
    }
  }

  /**
   * 从本地文件路径直接生成缩略图（local 存储最佳路径）
   * @param filePath 本机磁盘上的视频绝对路径
   * @param videoKey 视频在存储中的 key（用于生成缩略图路径）
   * @param timestamp 提取的时间点（秒）
   */
  async generateThumbnailFromFilePath(
    filePath: string,
    videoKey: string,
    timestamp?: number,
  ): Promise<{ url: string; key: string; duration?: number; width?: number; height?: number } | null> {
    const tempThumbnailPath = path.join(this.tempDir, `thumb-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);

    try {
      const videoInfo = await this.getVideoInfo(filePath);
      this.logger.log(`[ThumbnailService] (FILE) 视频信息:`, videoInfo);

      const extractTime = this.computeExtractTime(videoInfo.duration, timestamp);
      this.logger.log(`[ThumbnailService] (FILE) 从视频第 ${extractTime} 秒提取缩略图`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .inputOptions([`-ss ${extractTime}`])
          .outputOptions([
            '-frames:v 1',
            '-q:v 2',
            '-an',
            '-sn',
            '-dn',
            '-vf scale=400:-1',
          ])
          .output(tempThumbnailPath)
          .on('end', () => {
            this.logger.log(`[ThumbnailService] (FILE) 缩略图提取成功: ${tempThumbnailPath}`);
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`[ThumbnailService] (FILE) FFmpeg 错误:`, err);
            reject(err);
          })
          .run();
      });

      if (!fs.existsSync(tempThumbnailPath)) {
        throw new Error('缩略图文件未生成');
      }

      const thumbnailBuffer = await this.fsPromises.readFile(tempThumbnailPath);
      this.logger.log(`[ThumbnailService] (FILE) 缩略图大小: ${thumbnailBuffer.length} bytes`);

      // 生成缩略图的存储路径（与其他路径保持一致）
      let thumbnailKey = videoKey;
      if (thumbnailKey.includes('/source.')) {
        thumbnailKey = thumbnailKey.replace(/\/source\.[^/]+$/, '/thumb_200x.jpg');
      } else {
        if (thumbnailKey.startsWith('videos/')) {
          thumbnailKey = thumbnailKey.replace(/^videos\//, 'thumbnails/');
        } else {
          const parts = thumbnailKey.split('/');
          if (parts.length >= 2) {
            thumbnailKey = `thumbnails/${parts.slice(0, -1).join('/')}/${parts[parts.length - 1]}`;
          } else {
            thumbnailKey = `thumbnails/${thumbnailKey}`;
          }
        }
        thumbnailKey = thumbnailKey.replace(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i, '.jpg');
      }

      this.logger.log(`[ThumbnailService] (FILE) 上传缩略图到存储: ${thumbnailKey}`);
      const { url, key } = await this.storageService.uploadFile(thumbnailBuffer, thumbnailKey, 'image/jpeg');
      this.logger.log(`[ThumbnailService] (FILE) 缩略图上传成功: ${url}`);

      return {
        url,
        key,
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
      };
    } catch (error) {
      this.logger.error(`[ThumbnailService] (FILE) 生成缩略图失败:`, error);
      return null;
    } finally {
      try {
        if (fs.existsSync(tempThumbnailPath)) {
          await this.fsPromises.unlink(tempThumbnailPath);
        }
      } catch (cleanupError) {
        this.logger.warn(`[ThumbnailService] (FILE) 清理临时文件失败:`, cleanupError);
      }
    }
  }

  private computeExtractTime(duration: number | undefined, timestamp?: number): number {
    if (timestamp !== undefined) {
      return Math.max(0, timestamp);
    }

    const dur = duration || 10;
    const maxSeek = this.getMaxSeekSeconds();

    if (dur < 10) {
      return Math.min(2, dur * 0.3);
    }
    if (dur < 30) {
      return 3;
    }
    if (dur < 60) {
      return 5;
    }

    // 长视频：仍取 15% 位置，但为了速度限制最大 seek 秒数（local 大文件截帧会明显更快）
    const t = Math.max(5, Math.floor(dur * 0.15));
    return Math.min(maxSeek, t);
  }

  private getMaxSeekSeconds(): number {
    const raw = process.env.THUMBNAIL_MAX_SEEK_SECONDS;
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    const val = Number.isFinite(parsed) ? parsed : this.defaultMaxSeekSeconds;
    return Math.max(5, val);
  }

  /**
   * 获取视频信息（时长、分辨率等）- 公共方法
   * @param videoBuffer 视频文件的 Buffer
   * @returns 视频信息对象
   */
  async getVideoInfoFromBuffer(videoBuffer: Buffer): Promise<{ duration: number; width?: number; height?: number }> {
    const tempVideoPath = path.join(this.tempDir, `video-info-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`);
    
    try {
      await this.fsPromises.writeFile(tempVideoPath, videoBuffer);
      return await this.getVideoInfo(tempVideoPath);
    } finally {
      try {
        if (fs.existsSync(tempVideoPath)) {
          await this.fsPromises.unlink(tempVideoPath);
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

