import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { QueueService } from './src/modules/queue/queue.service';
import { DataSource } from 'typeorm';

/**
 * 重新生成所有视频的缩略图
 * 使用优化后的缩略图提取策略
 */
async function regenerateThumbnails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queueService = app.get(QueueService);
  const dataSource = app.get(DataSource);

  console.log('🎬 开始重新生成视频缩略图...\n');

  try {
    // 查询所有视频（类型为video的）
    const videos = await dataSource.query(`
      SELECT id, storage_key, name, thumbnail_url
      FROM videos
      WHERE type = 'video'
        AND deleted_at IS NULL
        AND storage_key IS NOT NULL
      ORDER BY created_at DESC
    `);

    console.log(`📊 找到 ${videos.length} 个视频需要重新生成缩略图\n`);

    if (videos.length === 0) {
      console.log('✅ 没有需要处理的视频');
      await app.close();
      return;
    }

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const progress = `[${i + 1}/${videos.length}]`;

      try {
        console.log(`${progress} 🔄 处理: ${video.name} (${video.id})`);
        console.log(`   当前缩略图: ${video.thumbnail_url || '无'}`);

        // 将缩略图生成任务添加到队列
        await queueService.addThumbnailJob({
          videoId: video.id,
          videoKey: video.storage_key,
        });

        console.log(`   ✅ 已添加到队列\n`);
        successCount++;

        // 每处理10个视频，输出一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`📊 进度: ${i + 1}/${videos.length}`);
          console.log(`   ✅ 已添加: ${successCount}`);
          console.log(`   ⏭️  跳过: ${skipCount}\n`);
        }
      } catch (error: any) {
        console.error(`   ❌ 失败: ${error.message}\n`);
        skipCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 最终统计:');
    console.log(`   总数: ${videos.length}`);
    console.log(`   ✅ 已添加到队列: ${successCount}`);
    console.log(`   ⏭️  跳过: ${skipCount}`);
    console.log('='.repeat(50));
    console.log('\n⏳ 缩略图生成任务已添加到队列，将由后台异步处理');
    console.log('💡 提示：可以查看后端日志了解处理进度');

  } catch (error: any) {
    console.error('❌ 执行失败:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

// 执行
regenerateThumbnails().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
