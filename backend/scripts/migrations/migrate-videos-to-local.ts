import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Video } from './src/modules/videos/entities/video.entity';
import { VideoTag } from './src/modules/videos/entities/video-tag.entity';
import { Project } from './src/modules/projects/entities/project.entity';
import { ProjectMember } from './src/modules/projects/entities/project-member.entity';
import { Team } from './src/modules/teams/entities/team.entity';
import { TeamMember } from './src/modules/teams/entities/team-member.entity';
import { User } from './src/modules/users/entities/user.entity';
import { Tag } from './src/modules/tags/entities/tag.entity';
import { Annotation } from './src/modules/annotations/entities/annotation.entity';
import { ProjectGroup } from './src/modules/project-groups/entities/project-group.entity';
import { Delivery } from './src/modules/deliveries/entities/delivery.entity';
import { StorageUsage } from './src/modules/storage/entities/storage-usage.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import axios from 'axios';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 视频迁移脚本
 * 将云端存储的视频迁移到本地存储
 */

const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH || '/www/wwwroot/vioflow_storage';
const BASE_URL = process.env.LOCAL_STORAGE_URL_BASE || 'http://localhost:3000/storage';

// 数据库连接配置
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/src/**/*.entity{.ts,.js}'],
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});

/**
 * 确保目录存在
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`✓ 创建目录: ${dirPath}`);
  }
}

/**
 * 从URL下载文件
 */
async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    console.log(`  → 下载文件: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5分钟超时
    });
    console.log(`  ✓ 下载成功: ${(response.data.length / 1024 / 1024).toFixed(2)} MB`);
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`  ✗ 下载失败: ${error.message}`);
    return null;
  }
}

/**
 * 保存文件到本地
 */
async function saveFile(buffer: Buffer, filePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_ROOT, filePath);
  const dirPath = path.dirname(fullPath);
  
  await ensureDirectoryExists(dirPath);
  await fs.writeFile(fullPath, buffer);
  console.log(`  ✓ 保存文件: ${fullPath}`);
}

/**
 * 构建新的存储路径（按照设计方案）
 */
function buildStoragePath(video: Video, team: Team, project: Project): string {
  // teams/{team_uuid}/projects/{project_uuid}/{video_uuid}/source.{ext}
  const ext = video.original_filename.split('.').pop() || 'mp4';
  return `teams/${team.id}/projects/${project.id}/${video.id}/source.${ext}`;
}

/**
 * 构建缩略图存储路径
 */
function buildThumbnailPath(video: Video, team: Team, project: Project): string {
  // teams/{team_uuid}/projects/{project_uuid}/{video_uuid}/thumb_200x.jpg
  return `teams/${team.id}/projects/${project.id}/${video.id}/thumb_200x.jpg`;
}

/**
 * 迁移单个视频
 */
async function migrateVideo(
  video: Video,
  team: Team,
  project: Project,
  videoRepository: any
): Promise<boolean> {
  try {
    console.log(`\n处理视频: ${video.name} (ID: ${video.id})`);
    console.log(`  项目: ${project.name}`);
    console.log(`  团队: ${team.name}`);
    console.log(`  原存储URL: ${video.storage_url}`);

    // 构建新的存储路径
    const newStoragePath = buildStoragePath(video, team, project);
    const newStorageKey = newStoragePath;
    const newStorageUrl = `${BASE_URL}/${newStoragePath}`;

    // 检查文件是否已经迁移
    const localFilePath = path.join(STORAGE_ROOT, newStoragePath);
    if (existsSync(localFilePath)) {
      console.log(`  ⚠ 文件已存在，跳过下载`);
    } else {
      // 下载视频文件
      const videoBuffer = await downloadFile(video.storage_url);
      if (!videoBuffer) {
        console.error(`  ✗ 跳过此视频（下载失败）`);
        return false;
      }

      // 保存到本地
      await saveFile(videoBuffer, newStoragePath);
    }

    // 处理缩略图（如果存在）
    let newThumbnailUrl = video.thumbnail_url;
    if (video.thumbnail_url) {
      const thumbnailPath = buildThumbnailPath(video, team, project);
      const localThumbnailPath = path.join(STORAGE_ROOT, thumbnailPath);
      
      if (existsSync(localThumbnailPath)) {
        console.log(`  ⚠ 缩略图已存在，跳过下载`);
      } else {
        const thumbnailBuffer = await downloadFile(video.thumbnail_url);
        if (thumbnailBuffer) {
          await saveFile(thumbnailBuffer, thumbnailPath);
          newThumbnailUrl = `${BASE_URL}/${thumbnailPath}`;
          console.log(`  ✓ 缩略图迁移成功`);
        } else {
          console.log(`  ⚠ 缩略图下载失败，保留原URL`);
        }
      }
    }

    // 更新数据库记录
    await videoRepository.update(video.id, {
      storage_url: newStorageUrl,
      storage_key: newStorageKey,
      thumbnail_url: newThumbnailUrl,
    });

    console.log(`  ✓ 数据库更新成功`);
    console.log(`  新存储URL: ${newStorageUrl}`);

    return true;
  } catch (error: any) {
    console.error(`  ✗ 迁移失败: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('========================================');
  console.log('视频迁移脚本 - 从云端迁移到本地存储');
  console.log('========================================');
  console.log(`存储根目录: ${STORAGE_ROOT}`);
  console.log(`访问URL基础路径: ${BASE_URL}`);
  console.log('');

  try {
    // 连接数据库
    console.log('连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    const videoRepository = dataSource.getRepository(Video);
    const projectRepository = dataSource.getRepository(Project);
    const teamRepository = dataSource.getRepository(Team);

    // 查询所有未删除的视频
    const videos = await videoRepository.find({
      where: { deleted_at: null },
      relations: ['project', 'project.team'],
      order: { upload_time: 'ASC' },
    });

    console.log(`找到 ${videos.length} 个待迁移的视频\n`);

    if (videos.length === 0) {
      console.log('没有需要迁移的视频');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`\n[${i + 1}/${videos.length}] ========================================`);

      // 检查是否已经是本地存储
      if (video.storage_url.includes(BASE_URL) || video.storage_url.includes(STORAGE_ROOT)) {
        console.log(`视频已在本地存储，跳过: ${video.name}`);
        skipCount++;
        continue;
      }

      // 获取关联的项目和团队
      const project = video.project;
      if (!project) {
        console.error(`视频 ${video.id} 没有关联项目，跳过`);
        failCount++;
        continue;
      }

      const team = project.team;
      if (!team) {
        console.error(`项目 ${project.id} 没有关联团队，跳过`);
        failCount++;
        continue;
      }

      // 迁移视频
      const success = await migrateVideo(video, team, project, videoRepository);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // 每10个视频暂停一下，避免过载
      if ((i + 1) % 10 === 0) {
        console.log('\n暂停 2 秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n========================================');
    console.log('迁移完成！');
    console.log('========================================');
    console.log(`总计: ${videos.length} 个视频`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    console.log(`跳过: ${skipCount} 个`);
    console.log('========================================\n');

  } catch (error: any) {
    console.error('迁移过程中发生错误:', error);
    console.error(error.stack);
  } finally {
    // 关闭数据库连接
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行迁移
migrate().catch(console.error);

