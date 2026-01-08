import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDeletedVideos() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未设置');
    return;
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 查询已删除的视频
    const deletedVideos = await dataSource.query(`
      SELECT 
        v.id, 
        v.name, 
        v.deleted_at,
        p.name as project_name,
        p.team_id
      FROM videos v
      LEFT JOIN projects p ON v.project_id = p.id
      WHERE v.deleted_at IS NOT NULL
      ORDER BY v.deleted_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 找到 ${deletedVideos.length} 个已删除的视频:\n`);
    deletedVideos.forEach((video: any, index: number) => {
      console.log(`${index + 1}. ${video.name}`);
      console.log(`   项目: ${video.project_name || '未知'}`);
      console.log(`   删除时间: ${video.deleted_at}`);
      console.log(`   Team ID: ${video.team_id || '无'}\n`);
    });

    // 统计每个团队的已删除视频数量
    const stats = await dataSource.query(`
      SELECT 
        p.team_id,
        t.name as team_name,
        COUNT(v.id) as deleted_count
      FROM videos v
      LEFT JOIN projects p ON v.project_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE v.deleted_at IS NOT NULL
      GROUP BY p.team_id, t.name
    `);

    console.log('\n📈 各团队已删除视频统计:');
    stats.forEach((stat: any) => {
      console.log(`  ${stat.team_name || '无团队'}: ${stat.deleted_count} 个`);
    });

  } catch (error: any) {
    console.error('❌ 错误:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

checkDeletedVideos();
