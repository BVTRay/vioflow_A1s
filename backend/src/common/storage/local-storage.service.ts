import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStorageService } from './storage.interface';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

@Injectable()
export class LocalStorageService implements IStorageService {
  private baseStoragePath: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    // 本地存储根目录
    this.baseStoragePath = this.configService.get<string>(
      'LOCAL_STORAGE_PATH',
      '/www/wwwroot/vioflow_storage'
    );
    
    // 本地存储访问URL基础路径
    this.baseUrl = this.configService.get<string>(
      'LOCAL_STORAGE_URL_BASE',
      'http://localhost:3000/storage'
    );

    console.log('[LocalStorageService] 初始化本地存储服务:', {
      baseStoragePath: this.baseStoragePath,
      baseUrl: this.baseUrl,
    });

    // 确保基础目录存在
    this.ensureDirectoryExists(this.baseStoragePath);
  }

  /**
   * 确保目录存在，不存在则创建
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`[LocalStorageService] 创建目录: ${dirPath}`);
      }
    } catch (error) {
      console.error(`[LocalStorageService] 创建目录失败: ${dirPath}`, error);
      throw error;
    }
  }

  /**
   * 上传文件到本地存储
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    path: string,
    contentType?: string,
  ): Promise<{ url: string; key: string }> {
    console.log(`[LocalStorageService] 开始保存文件:`, {
      path,
      contentType,
      size: file.length,
    });

    try {
      // 构建完整的文件路径
      const fullPath = this.getFullPath(path);
      
      // 确保目标目录存在
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      await this.ensureDirectoryExists(dirPath);

      // 写入文件
      await fs.writeFile(fullPath, file);

      console.log(`[LocalStorageService] 文件保存成功: ${fullPath}`);

      // 构建访问URL
      const url = `${this.baseUrl.replace(/\/$/, '')}/${path}`;

      return {
        url: url,
        key: path,
      };
    } catch (error: any) {
      console.error('[LocalStorageService] 保存文件失败:', error);
      throw new Error(`保存文件到本地失败: ${error.message || '未知错误'}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    console.log(`[LocalStorageService] 删除文件: ${path}`);

    try {
      const fullPath = this.getFullPath(path);
      
      if (existsSync(fullPath)) {
        await fs.unlink(fullPath);
        console.log(`[LocalStorageService] 文件删除成功: ${fullPath}`);
      } else {
        console.warn(`[LocalStorageService] 文件不存在: ${fullPath}`);
      }
    } catch (error: any) {
      console.error('[LocalStorageService] 删除文件失败:', error);
      throw new Error(`删除本地文件失败: ${error.message || '未知错误'}`);
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(path: string): Promise<Buffer | null> {
    console.log(`[LocalStorageService] 下载文件: ${path}`);

    try {
      const fullPath = this.getFullPath(path);
      
      if (!existsSync(fullPath)) {
        console.warn(`[LocalStorageService] 文件不存在: ${fullPath}`);
        return null;
      }

      const buffer = await fs.readFile(fullPath);
      console.log(`[LocalStorageService] 文件读取成功: ${fullPath}, size: ${buffer.length}`);
      return buffer;
    } catch (error: any) {
      console.error('[LocalStorageService] 下载文件失败:', error);
      return null;
    }
  }

  /**
   * 获取签名URL（本地存储返回公共URL）
   */
  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    // 本地存储不需要签名，直接返回公共URL
    return this.getPublicUrl(path);
  }

  /**
   * 获取公共URL
   */
  async getPublicUrl(path: string): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${path}`;
    console.log(`[LocalStorageService] 生成公共URL: ${url}`);
    return url;
  }

  /**
   * 列出文件
   */
  async listFiles(folder?: string): Promise<string[]> {
    console.log(`[LocalStorageService] 列出文件: ${folder || '/'}`);

    try {
      const fullPath = folder ? this.getFullPath(folder) : this.baseStoragePath;
      
      if (!existsSync(fullPath)) {
        return [];
      }

      const files = await this.readDirRecursive(fullPath);
      
      // 转换为相对路径
      const relativePaths = files.map(file => 
        file.replace(this.baseStoragePath + '/', '')
      );

      console.log(`[LocalStorageService] 找到 ${relativePaths.length} 个文件`);
      return relativePaths;
    } catch (error: any) {
      console.error('[LocalStorageService] 列出文件失败:', error);
      return [];
    }
  }

  /**
   * 递归读取目录中的所有文件
   */
  private async readDirRecursive(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.readDirRecursive(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 获取完整的文件系统路径
   */
  private getFullPath(relativePath: string): string {
    // 移除开头的斜杠
    const cleanPath = relativePath.replace(/^\/+/, '');
    return path.join(this.baseStoragePath, cleanPath);
  }

  /**
   * 获取文件在本机磁盘上的绝对路径（仅 local 存储可用）
   * 供 FFmpeg 等本地工具直接读取，避免走 HTTP/下载到内存。
   */
  getFileSystemPath(storageKey: string): string {
    return this.getFullPath(storageKey);
  }

  /**
   * 复制文件（用于迁移）
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const fullSourcePath = this.getFullPath(sourcePath);
    const fullDestPath = this.getFullPath(destPath);

    // 确保目标目录存在
    const destDir = fullDestPath.substring(0, fullDestPath.lastIndexOf('/'));
    await this.ensureDirectoryExists(destDir);

    await fs.copyFile(fullSourcePath, fullDestPath);
    console.log(`[LocalStorageService] 文件复制成功: ${sourcePath} -> ${destPath}`);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    const fullPath = this.getFullPath(path);
    return existsSync(fullPath);
  }
}


