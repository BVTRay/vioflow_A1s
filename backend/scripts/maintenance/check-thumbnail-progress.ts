import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function checkProgress() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🔍 检查缩略图重新生成进度...\n');

  try {
    // 统计总数
    const totalResult = await dataSource.query(`
      SELECT COUNT(*) as total
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND storage_key IS NOT NULL
    `);

    // 统计新缩略图数量（URL包含vioflow-a1s和thumbnails/）
    const newThumbnailsResult = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND storage_key IS NOT NULL
        AND thumbnail_url LIKE '%vioflow-a1s/thumbnails/%'
    `);

    // 统计旧缩略图数量（占位符或其他URL）
    const oldThumbnailsResult = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND storage_key IS NOT NULL
        AND (thumbnail_url IS NULL OR thumbnail_url NOT LIKE '%vioflow-a1s/thumbnails/%')
    `);

    const total = parseInt(totalResult[0].total);
    const newCount = parseInt(newThumbnailsResult[0].count);
    const oldCount = parseInt(oldThumbnailsResult[0].count);

    console.log('📊 总体进度:');
    console.log(`   总视频数: ${total}`);
    console.log(`   ✅ 已重新生成: ${newCount} (${((newCount / total) * 100).toFixed(1)}%)`);
    console.log(`   ⏳ 待处理: ${oldCount} (${((oldCount / total) * 100).toFixed(1)}%)`);
    console.log('');

    // 显示最近5个已完成的
    console.log('📹 最近完成的视频:');
    const recentCompleted = await dataSource.query(`
      SELECT name, thumbnail_url, updated_at
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND thumbnail_url LIKE '%vioflow-a1s/thumbnails/%'
      ORDER BY updated_at DESC
      LIMIT 5
    `);

    recentCompleted.forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.name}`);
      console.log(`      更新时间: ${video.updated_at}`);
    });

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await app.close();
  }
}

checkProgress().catch(console.error);
