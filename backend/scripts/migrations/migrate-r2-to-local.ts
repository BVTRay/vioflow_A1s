import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';
import { Video } from './src/modules/videos/entities/video.entity';
import { Project } from './src/modules/projects/entities/project.entity';
import { Team } from './src/modules/teams/entities/team.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';

// 加载环境变量
dotenv.config();

/**
 * R2 视频迁移脚本（带认证）
 * 使用 R2 SDK 下载需要认证的文件
 */

const STORAGE_ROOT = process.env.LOCAL_STORAGE_PATH || '/www/wwwroot/vioflow_storage';
const BASE_URL = process.env.LOCAL_STORAGE_URL_BASE || 'http://localhost:3000/storage';

// R2 客户端配置
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

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
  }
}

/**
 * 从R2下载文件
 */
async function downloadFromR2(storageKey: string): Promise<Buffer | null> {
  try {
    console.log(`  → 从 R2 下载: ${storageKey}`);
    
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'vioflow-a1s',
      Key: storageKey,
    });

    const response = await r2Client.send(command);
    
    if (!response.Body) {
      console.error(`  ✗ R2 响应无内容`);
      return null;
    }

    // 将 stream 转换为 Buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);
    console.log(`  ✓ 下载成功: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
  } catch (error: any) {
    console.error(`  ✗ R2 下载失败: ${error.message}`);
    return null;
  }
}

/**
 * 从 R2 URL 提取 storage key
 */
function extractR2Key(url: string): string | null {
  try {
    // https://xxx.r2.cloudflarestorage.com/bucket-name/path/to/file.mp4
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      // 移除 bucket 名称，返回文件路径
      pathParts.shift(); // 移除第一个部分（bucket名称）
      return pathParts.join('/');
    }
    return null;
  } catch {
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
 * 构建新的存储路径
 */
function buildStoragePath(video: Video, team: Team, project: Project): string {
  const ext = video.original_filename.split('.').pop() || 'mp4';
  return `teams/${team.id}/projects/${project.id}/${video.id}/source.${ext}`;
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

    // 检查是否是 R2 URL
    if (!video.storage_url.includes('.r2.cloudflarestorage.com')) {
      console.log(`  ⚠ 不是 R2 存储，跳过`);
      return false;
    }

    // 构建新的存储路径
    const newStoragePath = buildStoragePath(video, team, project);
    const newStorageUrl = `${BASE_URL}/${newStoragePath}`;

    // 检查文件是否已经迁移
    const localFilePath = path.join(STORAGE_ROOT, newStoragePath);
    if (existsSync(localFilePath)) {
      console.log(`  ⚠ 文件已存在，更新数据库URL`);
      await videoRepository.update(video.id, {
        storage_url: newStorageUrl,
        storage_key: newStoragePath,
      });
      return true;
    }

    // 从 storage_key 或 URL 提取 R2 key
    let r2Key = video.storage_key;
    if (!r2Key || r2Key.includes('http')) {
      r2Key = extractR2Key(video.storage_url);
    }

    if (!r2Key) {
      console.error(`  ✗ 无法提取 R2 key`);
      return false;
    }

    // 从 R2 下载文件
    const videoBuffer = await downloadFromR2(r2Key);
    if (!videoBuffer) {
      return false;
    }

    // 保存到本地
    await saveFile(videoBuffer, newStoragePath);

    // 更新数据库记录
    await videoRepository.update(video.id, {
      storage_url: newStorageUrl,
      storage_key: newStoragePath,
    });

    console.log(`  ✓ 迁移成功`);
    return true;
  } catch (error: any) {
    console.error(`  ✗ 迁移失败: ${error.message}`);
    return false;
  }
}

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('========================================');
  console.log('R2 视频迁移脚本（带认证）');
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

    // 只查询 R2 存储的视频
    const videos = await videoRepository
      .createQueryBuilder('video')
      .leftJoinAndSelect('video.project', 'project')
      .leftJoinAndSelect('project.team', 'team')
      .where('video.deleted_at IS NULL')
      .andWhere('video.storage_url LIKE :r2Pattern', { r2Pattern: '%r2.cloudflarestorage.com%' })
      .orderBy('video.upload_time', 'ASC')
      .getMany();

    console.log(`找到 ${videos.length} 个 R2 存储的视频\n`);

    if (videos.length === 0) {
      console.log('没有需要迁移的 R2 视频');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`\n[${i + 1}/${videos.length}] ========================================`);

      const project = video.project;
      const team = project?.team;

      if (!project || !team) {
        console.error(`视频缺少项目或团队信息，跳过`);
        failCount++;
        continue;
      }

      const success = await migrateVideo(video, team, project, videoRepository);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // 每5个视频暂停一下
      if ((i + 1) % 5 === 0 && i + 1 < videos.length) {
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
    console.log('========================================\n');

  } catch (error: any) {
    console.error('迁移过程中发生错误:', error);
    console.error(error.stack);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行迁移
migrate().catch(console.error);



