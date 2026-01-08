import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function checkVideoUrls() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 检查最近上传视频的URL...\n');

  try {
    const videos = await dataSource.query(`
      SELECT 
        id, 
        name, 
        storage_key, 
        storage_url,
        thumbnail_url,
        created_at
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`📊 找到 ${videos.length} 个最近上传的视频:\n`);

    videos.forEach((video, index) => {
      console.log(`\n${index + 1}. 📹 ${video.name}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   创建时间: ${video.created_at}`);
      console.log(`   视频存储Key: ${video.storage_key}`);
      console.log(`   视频URL: ${video.storage_url}`);
      console.log(`   缩略图URL: ${video.thumbnail_url || '无'}`);
      
      // 分析URL
      if (video.thumbnail_url) {
        console.log(`\n   🔍 URL分析:`);
        
        // 检查存储桶
        if (video.thumbnail_url.includes('vioflow-a1s')) {
          console.log(`   ✅ 存储桶正确 (vioflow-a1s)`);
        } else if (video.thumbnail_url.includes('/videos/')) {
          console.log(`   ❌ 存储桶错误 - 可能是Supabase的videos存储桶`);
        } else {
          console.log(`   ⚠️  存储桶未知`);
        }
        
        // 检查路径前缀
        if (video.thumbnail_url.includes('/thumbnails/')) {
          console.log(`   ✅ 路径前缀正确 (thumbnails/)`);
        } else if (video.thumbnail_url.includes('/videos/')) {
          console.log(`   ❌ 路径前缀错误 - 应该是thumbnails/而不是videos/`);
        } else {
          console.log(`   ⚠️  路径前缀未知`);
        }
      }
    });

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await app.close();
  }
}

checkVideoUrls().catch(console.error);
