import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_STORAGE_BUCKET', 'videos');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase configuration is missing, storage features will be disabled');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    path: string,
    contentType?: string,
  ): Promise<{ url: string; key: string }> {
    if (!this.supabase) {
      console.error('[SupabaseStorageService] Supabase 未配置');
      throw new Error('Supabase is not configured. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
    }

    console.log(`[SupabaseStorageService] 开始上传文件:`, {
      path,
      contentType,
      size: file.length,
      bucket: this.bucketName,
    });

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(path, file, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('[SupabaseStorageService] 上传失败:', error);
        const statusCode = (error as any).statusCode || (error as any).status || 'unknown';
        
        // 特殊处理文件大小超限错误 (413)
        if (statusCode === 413 || String(statusCode) === '413' || error.message?.includes('exceeded the maximum allowed size')) {
          const fileSizeMB = (file.length / 1024 / 1024).toFixed(2);
          throw new Error(`文件大小超过限制：当前文件 ${fileSizeMB}MB，Supabase 免费版限制为 50MB。请压缩视频或升级 Supabase 计划。`);
        }
        
        throw new Error(`上传到 Supabase 失败: ${error.message} (${statusCode})`);
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }

      console.log(`[SupabaseStorageService] 文件上传成功:`, data.path);

      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(path);

      console.log(`[SupabaseStorageService] 公共URL:`, urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        key: path,
      };
    } catch (error) {
      console.error('[SupabaseStorageService] 上传异常:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async getPublicUrl(path: string): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async listFiles(folder?: string): Promise<string[]> {
    if (!this.supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .list(folder || '', {
        limit: 1000,
      });

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data.map((file) => file.name);
  }
}

