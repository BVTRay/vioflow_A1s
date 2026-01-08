import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

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
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'vioflow_mam',
  };
}

const dataSource = new DataSource({
  ...dataSourceConfig,
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function migrateAllDataToBugong() {
  try {
    console.log('🔄 开始将所有数据迁移到不恭文化团队...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 找到不恭文化团队
    const bugongTeam = await dataSource.query(`
      SELECT id, name, code FROM "teams" WHERE name = '不恭文化' LIMIT 1
    `);

    if (bugongTeam.length === 0) {
      console.log('❌ 未找到"不恭文化"团队');
      console.log('💡 请先运行 create-team-and-users.ts 创建团队');
      process.exit(1);
    }

    const teamId = bugongTeam[0].id;
    console.log(`✅ 找到团队: ${bugongTeam[0].name} (${bugongTeam[0].code})\n`);

    // 2. 迁移所有项目
    console.log('2️⃣ 迁移项目...');
    const projectsResult = await dataSource.query(`
      UPDATE "projects"
      SET team_id = $1
      WHERE team_id IS NOT NULL OR team_id IS NULL
      RETURNING id, name
    `, [teamId]);
    console.log(`   ✅ 已迁移 ${projectsResult.length} 个项目\n`);

    // 3. 迁移项目组（如果有）
    console.log('3️⃣ 迁移项目组...');
    const projectGroupsResult = await dataSource.query(`
      UPDATE "project_groups"
      SET team_id = $1
      WHERE team_id IS NOT NULL OR team_id IS NULL
      RETURNING id, name
    `, [teamId]);
    console.log(`   ✅ 已迁移 ${projectGroupsResult.length} 个项目组\n`);

    // 4. 迁移存储使用统计（合并所有团队的数据到不恭文化团队）
    console.log('4️⃣ 更新存储使用统计...');
    
    // 先检查不恭文化团队是否已有存储统计
    const existingStorage = await dataSource.query(`
      SELECT id, total_size, standard_size, cold_size, file_count
      FROM "storage_usage"
      WHERE team_id = $1
    `, [teamId]);

    // 计算所有其他团队的总和
    const otherStorage = await dataSource.query(`
      SELECT 
        SUM(total_size) as total_size,
        SUM(standard_size) as standard_size,
        SUM(cold_size) as cold_size,
        SUM(file_count) as file_count
      FROM "storage_usage"
      WHERE team_id != $1
    `, [teamId]);

    if (existingStorage.length > 0) {
      // 如果已有统计，合并数据
      const current = existingStorage[0];
      const other = otherStorage[0];
      const newTotalSize = (parseInt(current.total_size || 0) + parseInt(other.total_size || 0));
      const newStandardSize = (parseInt(current.standard_size || 0) + parseInt(other.standard_size || 0));
      const newColdSize = (parseInt(current.cold_size || 0) + parseInt(other.cold_size || 0));
      const newFileCount = (parseInt(current.file_count || 0) + parseInt(other.file_count || 0));

      await dataSource.query(`
        UPDATE "storage_usage"
        SET 
          total_size = $1,
          standard_size = $2,
          cold_size = $3,
          file_count = $4,
          updated_at = now()
        WHERE team_id = $5
      `, [newTotalSize, newStandardSize, newColdSize, newFileCount, teamId]);
      console.log(`   ✅ 已合并存储统计数据\n`);
    } else {
      // 如果没有统计，创建新的
      const other = otherStorage[0];
      await dataSource.query(`
        INSERT INTO "storage_usage" (team_id, total_size, standard_size, cold_size, file_count, updated_at)
        VALUES ($1, $2, $3, $4, $5, now())
      `, [
        teamId,
        parseInt(other.total_size || 0),
        parseInt(other.standard_size || 0),
        parseInt(other.cold_size || 0),
        parseInt(other.file_count || 0)
      ]);
      console.log(`   ✅ 已创建存储统计\n`);
    }

    // 删除其他团队的存储统计
    const deleteResult = await dataSource.query(`
      DELETE FROM "storage_usage"
      WHERE team_id != $1
      RETURNING id
    `, [teamId]);
    console.log(`   ✅ 已删除 ${deleteResult.length} 条其他团队的存储统计记录\n`);

    // 5. 迁移审计日志（如果有）
    console.log('5️⃣ 迁移审计日志...');
    const auditLogsResult = await dataSource.query(`
      UPDATE "audit_logs"
      SET team_id = $1
      WHERE team_id IS NOT NULL AND team_id != $1
      RETURNING id
    `, [teamId]);
    console.log(`   ✅ 已迁移 ${auditLogsResult.length} 条审计日志\n`);

    // 6. 生成报告
    console.log('6️⃣ 生成迁移报告...');
    const finalProjects = await dataSource.query(`
      SELECT COUNT(*) as count FROM "projects" WHERE team_id = $1
    `, [teamId]);
    const finalVideos = await dataSource.query(`
      SELECT COUNT(*) as count FROM "videos" v
      JOIN "projects" p ON v.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);
    const finalDeliveries = await dataSource.query(`
      SELECT COUNT(*) as count FROM "deliveries" d
      JOIN "projects" p ON d.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);

    console.log('\n📊 迁移结果:');
    console.log(`   团队: ${bugongTeam[0].name}`);
    console.log(`   项目数: ${finalProjects[0]?.count || 0}`);
    console.log(`   视频数: ${finalVideos[0]?.count || 0}`);
    console.log(`   交付数: ${finalDeliveries[0]?.count || 0}`);
    console.log('');

    await dataSource.destroy();
    console.log('✅ 迁移完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 刷新前端页面');
    console.log('   2. 使用不恭文化团队的账号登录');
    console.log('   3. 应该能看到所有数据了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 迁移失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

migrateAllDataToBugong();

