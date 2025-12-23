import { DataSource } from 'typeorm';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';

// 加载环境变量
config();

async function migrateVideosToR2() {
  console.log('🚀 开始迁移视频到 R2 存储...\n');

  const configService = new ConfigService();
  const databaseUrl = configService.get<string>('DATABASE_URL');

  let dataSourceConfig: any;

  if (databaseUrl) {
    const urlObj = new URL(databaseUrl);
    const isSupabase = databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase.com');
    
    dataSourceConfig = {
      type: 'postgres',
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10) || 5432,
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      database: urlObj.pathname.slice(1),
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    };
  } else {
    dataSourceConfig = {
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get('DB_PORT', 5432),
      username: configService.get('DB_USERNAME', 'postgres'),
      password: configService.get('DB_PASSWORD', 'postgres'),
      database: configService.get('DB_DATABASE', 'vioflow_mam'),
    };
  }

  // 初始化数据库连接
  const dataSource = new DataSource({
    ...dataSourceConfig,
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 初始化 Supabase 客户端（用于下载现有视频）
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'videos';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase 配置缺失，无法下载现有视频');
      process.exit(1);
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase 客户端初始化成功\n');

    // 初始化 R2 客户端
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2Endpoint = process.env.R2_ENDPOINT;
    const r2BucketName = process.env.R2_BUCKET_NAME || 'vioflow-a1s';

    if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint) {
      console.error('❌ R2 配置缺失');
      process.exit(1);
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    console.log('✅ R2 客户端初始化成功\n');
    console.log(`📦 R2 存储桶: ${r2BucketName}\n`);

    // 查询所有未删除的视频
    const videos = await dataSource.query(`
      SELECT 
        id,
        storage_url,
        storage_key,
        size,
        project_id,
        name,
        original_filename
      FROM videos
      WHERE deleted_at IS NULL
        AND storage_key IS NOT NULL
        AND storage_key != ''
      ORDER BY created_at ASC
    `);

    console.log(`📊 找到 ${videos.length} 个视频需要迁移\n`);

    if (videos.length === 0) {
      console.log('✅ 没有需要迁移的视频');
      await dataSource.destroy();
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 生成 R2 公共 URL 的基础路径
    const endpointUrl = new URL(r2Endpoint);
    const accountId = endpointUrl.hostname.split('.')[0];
    const r2PublicBase = `https://${accountId}.r2.cloudflarestorage.com/${r2BucketName}`;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const progress = `[${i + 1}/${videos.length}]`;

      try {
        // 检查 storage_key 是否已经是 R2 路径（以 videos/ 开头）
        if (video.storage_key.startsWith('videos/')) {
          console.log(`${progress} ⏭️  跳过（已在 R2）: ${video.name} (${video.id})`);
          skipCount++;
          continue;
        }

        // 检查 storage_url 是否已经是 R2 URL
        if (video.storage_url && video.storage_url.includes('r2.cloudflarestorage.com')) {
          console.log(`${progress} ⏭️  跳过（已在 R2）: ${video.name} (${video.id})`);
          skipCount++;
          continue;
        }

        console.log(`${progress} 📥 下载: ${video.name} (${video.id})`);
        console.log(`   原始路径: ${video.storage_key}`);

        // 从 Supabase 下载视频
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(supabaseBucket)
          .download(video.storage_key);

        if (downloadError) {
          console.error(`   ❌ 下载失败: ${JSON.stringify(downloadError)}`);
          // 如果文件不存在，尝试检查是否已经在 R2
          const errorStatus = (downloadError as any).statusCode || (downloadError as any).status;
          if (downloadError.message?.includes('not found') || errorStatus === 404 || errorStatus === '404') {
            console.log(`   ℹ️  文件在 Supabase 中不存在，可能已删除或已在 R2`);
            // 如果 storage_url 包含 r2，说明可能已经在 R2，更新路径
            if (video.storage_url && video.storage_url.includes('r2.cloudflarestorage.com')) {
              // 从 URL 提取路径
              const urlParts = video.storage_url.split('/');
              const r2Path = urlParts.slice(urlParts.indexOf(r2BucketName) + 1).join('/');
              if (r2Path && r2Path !== video.storage_key) {
                await dataSource.query(
                  `UPDATE videos SET storage_key = $1 WHERE id = $2`,
                  [r2Path, video.id]
                );
                console.log(`   ✅ 已更新 storage_key 为 R2 路径: ${r2Path}`);
                successCount++;
              } else {
                skipCount++;
              }
            } else {
              skipCount++;
            }
          } else {
            errorCount++;
          }
          continue;
        }

        if (!fileData) {
          console.error(`   ❌ 下载失败: 文件数据为空`);
          errorCount++;
          continue;
        }

        // 将 Blob 转换为 Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        console.log(`   ✅ 下载成功: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        // 生成新的 R2 存储路径
        // 如果原路径是 projectId/filename，则转换为 videos/projectId/filename
        // 如果原路径已经是其他格式，保持 projectId 部分，但添加 videos/ 前缀
        let newR2Key: string;
        if (video.storage_key.includes('/')) {
          const parts = video.storage_key.split('/');
          if (parts.length >= 2) {
            // 假设第一部分是 projectId
            newR2Key = `videos/${video.storage_key}`;
          } else {
            // 如果只有文件名，使用 project_id
            newR2Key = `videos/${video.project_id}/${video.storage_key}`;
          }
        } else {
          // 如果只有文件名，使用 project_id
          newR2Key = `videos/${video.project_id}/${video.storage_key}`;
        }

        // 确保路径不以 videos/videos/ 开头
        if (newR2Key.startsWith('videos/videos/')) {
          newR2Key = newR2Key.replace(/^videos\/videos\//, 'videos/');
        }

        console.log(`   📤 上传到 R2: ${newR2Key}`);

        // 上传到 R2
        const putCommand = new PutObjectCommand({
          Bucket: r2BucketName,
          Key: newR2Key,
          Body: fileBuffer,
          ContentType: 'video/mp4', // 可以根据文件扩展名判断
        });

        await s3Client.send(putCommand);

        // 生成新的 R2 URL
        const newR2Url = `${r2PublicBase}/${newR2Key}`;

        console.log(`   ✅ 上传成功`);

        // 更新数据库中的 storage_url 和 storage_key
        await dataSource.query(
          `UPDATE videos 
           SET storage_url = $1, storage_key = $2 
           WHERE id = $3`,
          [newR2Url, newR2Key, video.id]
        );

        console.log(`   ✅ 数据库已更新\n`);
        successCount++;

        // 每迁移 10 个文件，输出一次进度
        if ((i + 1) % 10 === 0) {
          console.log(`\n📊 进度: ${i + 1}/${videos.length}`);
          console.log(`   ✅ 成功: ${successCount}`);
          console.log(`   ⏭️  跳过: ${skipCount}`);
          console.log(`   ❌ 失败: ${errorCount}\n`);
        }
      } catch (error: any) {
        console.error(`   ❌ 迁移失败: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 迁移完成统计:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ⏭️  跳过: ${skipCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    console.log(`   📦 总计: ${videos.length}`);
    console.log('='.repeat(50) + '\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 迁移失败:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

migrateVideosToR2();

