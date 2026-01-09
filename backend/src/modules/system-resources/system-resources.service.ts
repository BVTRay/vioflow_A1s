import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

/**
 * 系统资源服务
 * 用于管理系统公共资源，如Logo、默认头像、Banner等
 */
@Injectable()
export class SystemResourcesService {
  private systemResourcesPath: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    const baseStoragePath = this.configService.get<string>(
      'LOCAL_STORAGE_PATH',
      '/www/wwwroot/vioflow_storage'
    );
    
    this.systemResourcesPath = path.join(baseStoragePath, 'system');
    this.baseUrl = this.configService.get<string>(
      'LOCAL_STORAGE_URL_BASE',
      'http://localhost:3000/storage'
    );

    // 确保系统资源目录存在
    this.ensureDirectoriesExist();
  }

  /**
   * 确保系统资源目录结构存在
   */
  private async ensureDirectoriesExist(): Promise<void> {
    const directories = [
      this.systemResourcesPath,
      path.join(this.systemResourcesPath, 'defaults'),
      path.join(this.systemResourcesPath, 'assets'),
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`[SystemResourcesService] 创建目录: ${dir}`);
      }
    }
  }

  /**
   * 获取系统资源的完整路径
   * @param resourcePath 资源相对路径，例如 'defaults/logo.png' 或 'assets/banner.jpg'
   */
  getResourcePath(resourcePath: string): string {
    const fullPath = path.join(this.systemResourcesPath, resourcePath);
    
    // 安全检查：确保路径在系统资源目录内
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(this.systemResourcesPath)) {
      throw new Error('无效的资源路径');
    }

    return normalizedPath;
  }

  /**
   * 获取系统资源的访问URL
   * @param resourcePath 资源相对路径
   */
  getResourceUrl(resourcePath: string): string {
    // 移除开头的斜杠（如果有）
    const cleanPath = resourcePath.startsWith('/') ? resourcePath.slice(1) : resourcePath;
    return `${this.baseUrl}/system/${cleanPath}`;
  }

  /**
   * 检查资源是否存在
   * @param resourcePath 资源相对路径
   */
  async resourceExists(resourcePath: string): Promise<boolean> {
    try {
      const fullPath = this.getResourcePath(resourcePath);
      return existsSync(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * 获取资源文件信息
   * @param resourcePath 资源相对路径
   */
  async getResourceInfo(resourcePath: string): Promise<{
    exists: boolean;
    path: string;
    url: string;
    size?: number;
    mtime?: Date;
  }> {
    const exists = await this.resourceExists(resourcePath);
    const info: any = {
      exists,
      path: this.getResourcePath(resourcePath),
      url: this.getResourceUrl(resourcePath),
    };

    if (exists) {
      const stats = await fs.stat(info.path);
      info.size = stats.size;
      info.mtime = stats.mtime;
    }

    return info;
  }

  /**
   * 列出指定目录下的所有资源文件
   * @param subPath 子目录路径，例如 'defaults' 或 'assets'
   */
  async listResources(subPath: string = ''): Promise<string[]> {
    const targetPath = subPath 
      ? path.join(this.systemResourcesPath, subPath)
      : this.systemResourcesPath;

    // 安全检查
    const normalizedPath = path.normalize(targetPath);
    if (!normalizedPath.startsWith(this.systemResourcesPath)) {
      throw new Error('无效的目录路径');
    }

    if (!existsSync(targetPath)) {
      return [];
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const relativePath = subPath 
          ? path.join(subPath, entry.name)
          : entry.name;
        files.push(relativePath);
      }
    }

    return files.sort();
  }

  /**
   * 保存系统资源文件
   * @param resourcePath 资源相对路径
   * @param buffer 文件内容
   */
  async saveResource(resourcePath: string, buffer: Buffer): Promise<void> {
    const fullPath = this.getResourcePath(resourcePath);
    const dir = path.dirname(fullPath);

    // 确保目录存在
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
    console.log(`[SystemResourcesService] 保存资源: ${resourcePath}`);
  }

  /**
   * 删除系统资源文件
   * @param resourcePath 资源相对路径
   */
  async deleteResource(resourcePath: string): Promise<void> {
    const fullPath = this.getResourcePath(resourcePath);
    
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
      console.log(`[SystemResourcesService] 删除资源: ${resourcePath}`);
    }
  }

  /**
   * 获取常用系统资源的URL（便捷方法）
   */
  getCommonResourceUrls(): {
    logo?: string;
    favicon?: string;
    defaultAvatar?: string;
    banner?: string;
  } {
    const urls: any = {};

    // 检查并返回存在的资源URL
    const commonResources = [
      { key: 'logo', paths: ['defaults/logo.png', 'defaults/logo.svg', 'assets/logo.png', 'assets/logo.svg'] },
      { key: 'favicon', paths: ['defaults/favicon.ico', 'assets/favicon.ico'] },
      { key: 'defaultAvatar', paths: ['defaults/avatar.png', 'defaults/avatar.jpg', 'defaults/default-avatar.png'] },
      { key: 'banner', paths: ['assets/banner.jpg', 'assets/banner.png'] },
    ];

    for (const resource of commonResources) {
      for (const resourcePath of resource.paths) {
        const fullPath = this.getResourcePath(resourcePath);
        if (existsSync(fullPath)) {
          urls[resource.key] = this.getResourceUrl(resourcePath);
          break;
        }
      }
    }

    return urls;
  }
}











