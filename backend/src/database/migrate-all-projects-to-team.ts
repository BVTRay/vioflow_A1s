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

async function migrateAllProjectsToTeam() {
  try {
    console.log('🔄 开始将所有项目迁移到 admin 的团队...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 找到 admin 用户的团队
    const adminUser = await dataSource.query(`
      SELECT id, email FROM "users" WHERE email = 'admin@vioflow.com' LIMIT 1
    `);
    
    if (adminUser.length === 0) {
      console.log('❌ 未找到 admin 用户');
      process.exit(1);
    }

    const adminUserId = adminUser[0].id;
    console.log(`📋 找到 admin 用户: ${adminUser[0].email} (${adminUserId})\n`);

    // 2. 找到 admin 的团队
    const adminTeam = await dataSource.query(`
      SELECT t.id, t.name 
      FROM "teams" t
      JOIN "team_members" tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND tm.status = 'active'
      LIMIT 1
    `, [adminUserId]);

    if (adminTeam.length === 0) {
      console.log('❌ 未找到 admin 的团队');
      process.exit(1);
    }

    const targetTeamId = adminTeam[0].id;
    console.log(`✅ 找到目标团队: ${adminTeam[0].name} (${targetTeamId})\n`);

    // 3. 查看当前项目分布
    console.log('📊 当前项目分布:');
    const currentDistribution = await dataSource.query(`
      SELECT t.id, t.name, COUNT(p.id) as project_count
      FROM "teams" t
      LEFT JOIN "projects" p ON t.id = p.team_id
      GROUP BY t.id, t.name
      ORDER BY project_count DESC
    `);
    
    currentDistribution.forEach((row: any) => {
      console.log(`   - ${row.name}: ${row.project_count} 个项目`);
    });
    console.log('');

    // 4. 迁移所有项目到 admin 的团队
    console.log('🔄 开始迁移项目...');
    const updateResult = await dataSource.query(`
      UPDATE "projects"
      SET team_id = $1
      WHERE team_id IS NOT NULL
      RETURNING id, name, team_id
    `, [targetTeamId]);

    console.log(`✅ 已迁移 ${updateResult.length} 个项目到 ${adminTeam[0].name}\n`);

    // 5. 验证迁移结果
    console.log('📊 迁移后的项目分布:');
    const newDistribution = await dataSource.query(`
      SELECT t.id, t.name, COUNT(p.id) as project_count
      FROM "teams" t
      LEFT JOIN "projects" p ON t.id = p.team_id
      GROUP BY t.id, t.name
      ORDER BY project_count DESC
    `);
    
    newDistribution.forEach((row: any) => {
      console.log(`   - ${row.name}: ${row.project_count} 个项目`);
    });
    console.log('');

    // 6. 验证 admin 团队的项目数
    const adminTeamProjects = await dataSource.query(`
      SELECT COUNT(*) as count FROM "projects" WHERE team_id = $1
    `, [targetTeamId]);
    
    console.log(`✅ admin 的团队现在有 ${adminTeamProjects[0]?.count || 0} 个项目\n`);

    await dataSource.destroy();
    console.log('✅ 迁移完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 刷新前端页面');
    console.log('   2. 应该能看到所有 13 个项目了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 迁移失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

migrateAllProjectsToTeam();


