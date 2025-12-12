import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

config({ path: path.join(__dirname, '../../.env') });

// 支持 DATABASE_URL 环境变量（Supabase/Railway）或单独配置（本地）
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

// 生成8-12位团队编码
function generateTeamCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8 + Math.floor(Math.random() * 5); // 8-12位
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function fixMissingData() {
  try {
    console.log('🔧 开始修复缺失的数据...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查并创建枚举类型
    console.log('1️⃣ 检查枚举类型...');
    try {
      await dataSource.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role_enum') THEN
            CREATE TYPE "team_role_enum" AS ENUM('super_admin', 'admin', 'member');
          END IF;
        END $$;
      `);
      await dataSource.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status_enum') THEN
            CREATE TYPE "member_status_enum" AS ENUM('pending', 'active', 'removed');
          END IF;
        END $$;
      `);
      console.log('   ✅ 枚举类型已创建或已存在');
    } catch (error: any) {
      console.log(`   ⚠️  枚举类型检查失败: ${error.message}`);
    }
    console.log('');

    // 2. 检查 teams 表是否存在，如果不存在则创建
    console.log('2️⃣ 检查 teams 表...');
    const teamsTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'teams'
      );
    `);
    
    if (!teamsTableExists[0]?.exists) {
      console.log('   ⚠️  teams 表不存在，需要运行迁移脚本');
      console.log('   💡 请先运行 migration-add-teams-and-permissions.sql');
      process.exit(1);
    }
    console.log('   ✅ teams 表存在');

    // 3. 为每个用户创建默认团队
    console.log('3️⃣ 为现有用户创建默认团队...');
    const users = await dataSource.query('SELECT id, email, name FROM "users" ORDER BY created_at');
    console.log(`   📋 找到 ${users.length} 个用户`);

    for (const user of users) {
      // 检查用户是否已有团队
      const existingTeam = await dataSource.query(`
        SELECT t.id, t.name 
        FROM "teams" t
        JOIN "team_members" tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND tm.status = 'active'
        LIMIT 1
      `, [user.id]);

      if (existingTeam.length > 0) {
        console.log(`   ⏭️  ${user.email} 已有团队: ${existingTeam[0].name}`);
        continue;
      }

      // 创建默认团队
      let teamCode = generateTeamCode();
      let codeExists = true;
      while (codeExists) {
        const check = await dataSource.query('SELECT id FROM "teams" WHERE code = $1', [teamCode]);
        if (check.length === 0) {
          codeExists = false;
        } else {
          teamCode = generateTeamCode();
        }
      }

      const teamName = `${user.name} 的团队`;
      const teamResult = await dataSource.query(`
        INSERT INTO "teams" (name, code, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now(), now())
        RETURNING id, name, code
      `, [teamName, teamCode, `为 ${user.name} 创建的默认团队`, user.id]);

      const team = teamResult[0];
      console.log(`   ✅ 为用户 ${user.email} 创建团队: ${team.name} (${team.code})`);

      // 将用户添加为超级管理员
      await dataSource.query(`
        INSERT INTO "team_members" (team_id, user_id, role, status, joined_at, created_at, updated_at)
        VALUES ($1, $2, 'super_admin', 'active', now(), now(), now())
      `, [team.id, user.id]);
      console.log(`   ✅ 将 ${user.email} 添加为超级管理员`);
    }
    console.log('');

    // 4. 将现有项目关联到用户的默认团队
    console.log('4️⃣ 关联现有项目到团队...');
    const unlinkedProjects = await dataSource.query(`
      SELECT p.id, p.name
      FROM "projects" p
      WHERE p.team_id IS NULL
    `);
    console.log(`   📋 找到 ${unlinkedProjects.length} 个未关联团队的项目`);

    for (const project of unlinkedProjects) {
      // 通过项目成员找到第一个成员，然后找到该成员的团队
      const projectMember = await dataSource.query(`
        SELECT pm.user_id 
        FROM "project_members" pm
        WHERE pm.project_id = $1
        ORDER BY pm.created_at ASC
        LIMIT 1
      `, [project.id]);

      let teamId = null;

      if (projectMember.length > 0) {
        // 找到该成员的团队
        const userTeam = await dataSource.query(`
          SELECT t.id 
          FROM "teams" t
          JOIN "team_members" tm ON t.id = tm.team_id
          WHERE tm.user_id = $1 AND tm.status = 'active'
          LIMIT 1
        `, [projectMember[0].user_id]);
        
        if (userTeam.length > 0) {
          teamId = userTeam[0].id;
        }
      }

      // 如果没有找到，使用第一个可用团队
      if (!teamId) {
        const anyTeam = await dataSource.query('SELECT id FROM "teams" LIMIT 1');
        if (anyTeam.length > 0) {
          teamId = anyTeam[0].id;
        }
      }

      if (teamId) {
        await dataSource.query(`
          UPDATE "projects" 
          SET team_id = $1 
          WHERE id = $2
        `, [teamId, project.id]);
        console.log(`   ✅ 项目 ${project.name} 已关联到团队`);
      } else {
        console.log(`   ⚠️  项目 ${project.name} 无法关联：没有可用团队`);
      }
    }
    console.log('');

    // 5. 初始化 storage_usage
    console.log('5️⃣ 初始化存储使用统计...');
    const teams = await dataSource.query('SELECT id FROM "teams"');
    for (const team of teams) {
      const existing = await dataSource.query('SELECT id FROM "storage_usage" WHERE team_id = $1', [team.id]);
      if (existing.length === 0) {
        await dataSource.query(`
          INSERT INTO "storage_usage" (team_id, total_size, standard_size, cold_size, file_count, updated_at)
          VALUES ($1, 0, 0, 0, 0, now())
        `, [team.id]);
        console.log(`   ✅ 为团队 ${team.id} 初始化存储统计`);
      }
    }
    console.log('');

    // 6. 生成报告
    console.log('6️⃣ 生成修复报告...');
    const finalTeams = await dataSource.query('SELECT COUNT(*) as count FROM "teams"');
    const finalMembers = await dataSource.query('SELECT COUNT(*) as count FROM "team_members"');
    const projectsWithTeam = await dataSource.query('SELECT COUNT(*) as count FROM "projects" WHERE team_id IS NOT NULL');
    const finalProjectsWithoutTeam = await dataSource.query('SELECT COUNT(*) as count FROM "projects" WHERE team_id IS NULL');

    console.log('   📊 修复结果:');
    console.log(`      - 团队: ${finalTeams[0]?.count || 0} 个`);
    console.log(`      - 团队成员: ${finalMembers[0]?.count || 0} 个`);
    console.log(`      - 已关联团队的项目: ${projectsWithTeam[0]?.count || 0} 个`);
    console.log(`      - 未关联团队的项目: ${finalProjectsWithoutTeam[0]?.count || 0} 个`);
    console.log('');

    await dataSource.destroy();
    console.log('✅ 数据修复完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 如果 RLS 策略未启用，请运行 SUPABASE_RLS_POLICIES.sql');
    console.log('   2. 刷新前端页面，应该能看到数据了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 修复失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

fixMissingData();

