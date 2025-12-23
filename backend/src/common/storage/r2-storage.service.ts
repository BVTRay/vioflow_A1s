import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService } from './storage.interface';

@Injectable()
export class R2StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrlBase: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'videos');
    this.publicUrlBase = this.configService.get<string>('R2_PUBLIC_URL_BASE', '');

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.warn('R2 configuration is missing, storage features will be disabled');
      return;
    }

    // 创建 S3 客户端，配置为使用 Cloudflare R2
    this.s3Client = new S3Client({
      region: 'auto', // R2 使用 'auto' 作为区域
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    console.log('[R2StorageService] R2 存储服务已初始化', {
      endpoint,
      bucket: this.bucketName,
      hasPublicUrlBase: !!this.publicUrlBase,
    });
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    path: string,
    contentType?: string,
  ): Promise<{ url: string; key: string }> {
    if (!this.s3Client) {
      console.error('[R2StorageService] R2 未配置');
      throw new Error('R2 is not configured. Please check R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT environment variables.');
    }

    console.log(`[R2StorageService] 开始上传文件:`, {
      path,
      contentType,
      size: file.length,
      bucket: this.bucketName,
    });

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: file,
        ContentType: contentType || 'application/octet-stream',
      });

      await this.s3Client.send(command);

      console.log(`[R2StorageService] 文件上传成功:`, path);

      // 生成公共 URL
      // 如果有配置公共 URL 基础路径，使用它；否则使用 R2 公共访问 URL 格式
      let url: string;
      if (this.publicUrlBase) {
        // 如果配置了公共 URL 基础路径（自定义域名），直接拼接
        url = `${this.publicUrlBase.replace(/\/$/, '')}/${path}`;
      } else {
        // 否则使用 R2 公共访问 URL 格式
        // R2 公共 URL 格式：https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<path>
        const endpointUrl = new URL(this.configService.get<string>('R2_ENDPOINT') || '');
        // 从端点 URL 中提取账户 ID（hostname 的第一部分）
        const accountId = endpointUrl.hostname.split('.')[0];
        url = `https://${accountId}.r2.cloudflarestorage.com/${this.bucketName}/${path}`;
      }

      console.log(`[R2StorageService] 公共URL:`, url);

      return {
        url: url,
        key: path,
      };
    } catch (error: any) {
      console.error('[R2StorageService] 上传失败:', error);
      throw new Error(`上传到 R2 失败: ${error.message || '未知错误'}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('R2 is not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3Client.send(command);
      console.log(`[R2StorageService] 文件删除成功:`, path);
    } catch (error: any) {
      console.error('[R2StorageService] 删除失败:', error);
      throw new Error(`删除文件失败: ${error.message || '未知错误'}`);
    }
  }

  async downloadFile(path: string): Promise<Buffer | null> {
    if (!this.s3Client) {
      throw new Error('R2 is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        return null;
      }

      // 将流转换为 Buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error('[R2StorageService] 下载失败:', error);
      return null;
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('R2 is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresIn,
      });

      return signedUrl;
    } catch (error: any) {
      console.error('[R2StorageService] 生成签名 URL 失败:', error);
      throw new Error(`生成签名 URL 失败: ${error.message || '未知错误'}`);
    }
  }

  async getPublicUrl(path: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('R2 is not configured');
    }

    // 如果有配置公共 URL 基础路径（自定义域名），使用它
    if (this.publicUrlBase) {
      return `${this.publicUrlBase.replace(/\/$/, '')}/${path}`;
    }

    // 否则使用 R2 公共访问 URL 格式
    // R2 公共 URL 格式：https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/<path>
    const endpoint = this.configService.get<string>('R2_ENDPOINT') || '';
    const endpointUrl = new URL(endpoint);
    const accountId = endpointUrl.hostname.split('.')[0];
    return `https://${accountId}.r2.cloudflarestorage.com/${this.bucketName}/${path}`;
  }

  async listFiles(folder?: string): Promise<string[]> {
    if (!this.s3Client) {
      throw new Error('R2 is not configured');
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folder || '',
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((object) => object.Key || '').filter((key) => key.length > 0);
    } catch (error: any) {
      console.error('[R2StorageService] 列出文件失败:', error);
      throw new Error(`列出文件失败: ${error.message || '未知错误'}`);
    }
  }
}

