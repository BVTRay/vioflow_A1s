import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { R2StorageService } from './src/common/storage/r2-storage.service';

async function checkR2Thumbnails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const storageService = app.get('IStorageService') as R2StorageService;

  console.log('🔍 检查R2中缩略图文件是否存在...\n');

  try {
    const videos = await dataSource.query(`
      SELECT 
        id, 
        name, 
        storage_key, 
        thumbnail_url,
        created_at
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND thumbnail_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`📊 检查 ${videos.length} 个视频的缩略图:\n`);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`\n${i + 1}. 📹 ${video.name}`);
      
      // 从视频的storage_key生成缩略图key
      let thumbnailKey = video.storage_key;
      if (thumbnailKey.startsWith('videos/')) {
        thumbnailKey = thumbnailKey.replace(/^videos\//, 'thumbnails/');
      }
      thumbnailKey = thumbnailKey.replace(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i, '.jpg');
      
      console.log(`   缩略图Key: ${thumbnailKey}`);
      console.log(`   缩略图URL: ${video.thumbnail_url}`);
      
      // 尝试从R2下载缩略图
      try {
        const thumbnailBuffer = await storageService.downloadFile(thumbnailKey);
        
        if (thumbnailBuffer && thumbnailBuffer.length > 0) {
          console.log(`   ✅ 缩略图存在 (${(thumbnailBuffer.length / 1024).toFixed(2)} KB)`);
        } else {
          console.log(`   ❌ 缩略图不存在或为空`);
        }
      } catch (error: any) {
        console.log(`   ❌ 下载失败: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await app.close();
  }
}

checkR2Thumbnails().catch(console.error);
