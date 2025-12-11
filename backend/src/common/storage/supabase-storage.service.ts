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
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      key: path,
    };
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

