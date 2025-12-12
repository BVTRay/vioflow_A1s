import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

config({ path: path.join(__dirname, '../../.env') });

// 支持 DATABASE_URL 环境变量（Supabase/Railway）或单独配置（本地）
const databaseUrl = process.env.DATABASE_URL;

let dataSourceConfig: any;

if (databaseUrl) {
  // 使用 DATABASE_URL（Supabase 或 Railway）
  const urlObj = new URL(databaseUrl);
  const isSupabase = databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase.com');
  
  dataSourceConfig = {
    type: 'postgres',
    host: urlObj.hostname,
    port: parseInt(urlObj.port, 10) || 5432,
    username: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    database: urlObj.pathname.slice(1), // 移除前导斜杠
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
} else {
  // 使用单独的环境变量（本地开发，向后兼容）
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

async function checkAll() {
  try {
    console.log('🔍 开始全面检查数据库...\n');
    
    // ============================================
    // 1. 检查数据库连接
    // ============================================
    console.log('1️⃣ 检查数据库连接...');
    try {
      await dataSource.initialize();
      console.log('   ✅ 数据库连接成功');
      
      // 测试查询
      const testResult = await dataSource.query('SELECT version()');
      console.log('   ✅ 数据库版本:', testResult[0]?.version?.split(' ')[0] || '未知');
    } catch (error: any) {
      console.error('   ❌ 数据库连接失败:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.error('   💡 请确保数据库服务已启动');
      } else if (error.message.includes('password authentication')) {
        console.error('   💡 请检查数据库密码是否正确');
      } else if (error.message.includes('does not exist')) {
        console.error('   💡 请检查数据库名称是否正确');
      }
      process.exit(1);
    }
    console.log('');

    // ============================================
    // 2. 检查表结构
    // ============================================
    console.log('2️⃣ 检查数据库表结构...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const existingTables = tables.map((t: any) => t.table_name);
    console.log(`   ✅ 找到 ${tables.length} 个表`);
    
    // 检查核心表
    const coreTables = [
      'users', 'teams', 'team_members', 'projects', 'project_groups',
      'videos', 'tags', 'project_members', 'deliveries', 'share_links',
      'notifications', 'audit_logs', 'storage_usage'
    ];
    
    const missingTables = coreTables.filter(t => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.log(`   ⚠️  缺少以下核心表: ${missingTables.join(', ')}`);
      console.log('   💡 建议运行迁移脚本创建缺失的表');
    } else {
      console.log('   ✅ 所有核心表都存在');
    }
    console.log('');

    // ============================================
    // 3. 检查迁移文件
    // ============================================
    console.log('3️⃣ 检查迁移文件...');
    const migrationFiles = [
      'migration-add-teams-and-permissions.sql',
      'migration-add-share-link-access-logs.sql',
      'SUPABASE_QUICK_START.sql',
      'SUPABASE_RLS_POLICIES.sql'
    ];
    
    const migrationDir = path.join(__dirname);
    migrationFiles.forEach(file => {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`   ❌ ${file} 不存在`);
      }
    });
    console.log('');

    // ============================================
    // 4. 检查种子文件
    // ============================================
    console.log('4️⃣ 检查种子文件...');
    const seedFiles = [
      'seed-data.sql',
      'seed-data-fixed.sql',
      'seed-data-cloud.sql'
    ];
    
    seedFiles.forEach(file => {
      const filePath = path.join(migrationDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`   ⚠️  ${file} 不存在`);
      }
    });
    
    // 检查 TypeScript 种子文件
    const seedDir = path.join(migrationDir, 'seeds');
    if (fs.existsSync(seedDir)) {
      const seedTsFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('.ts'));
      console.log(`   ✅ 找到 ${seedTsFiles.length} 个 TypeScript 种子文件`);
      seedTsFiles.forEach(file => {
        console.log(`      - ${file}`);
      });
    }
    console.log('');

    // ============================================
    // 5. 检查数据量
    // ============================================
    console.log('5️⃣ 检查数据量...');
    const tablesToCheck = [
      'users', 'teams', 'team_members', 'projects', 'project_groups',
      'videos', 'tags', 'project_members', 'deliveries', 'notifications',
      'audit_logs', 'storage_usage', 'share_links'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        if (existingTables.includes(tableName)) {
          const result = await dataSource.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const count = parseInt(result[0]?.count || '0');
          if (count > 0) {
            console.log(`   ✅ ${tableName}: ${count} 条记录`);
          } else {
            console.log(`   ⚠️  ${tableName}: 0 条记录（表为空）`);
          }
        } else {
          console.log(`   ❌ ${tableName}: 表不存在`);
        }
      } catch (error: any) {
        console.log(`   ❌ ${tableName}: 检查失败 - ${error.message}`);
      }
    }
    console.log('');

    // ============================================
    // 6. 检查团队和项目关联
    // ============================================
    console.log('6️⃣ 检查团队和项目关联...');
    
    // 检查团队数据
    try {
      if (existingTables.includes('teams')) {
        const teams = await dataSource.query('SELECT id, name, code, created_by FROM "teams" LIMIT 10');
        console.log(`   ✅ 找到 ${teams.length} 个团队:`);
        teams.forEach((team: any) => {
          console.log(`      - ${team.name} (${team.code}) - 创建者: ${team.created_by}`);
        });
      } else {
        console.log('   ❌ teams 表不存在');
      }
    } catch (error: any) {
      console.log(`   ❌ 检查团队失败: ${error.message}`);
    }

    // 检查团队成员
    try {
      if (existingTables.includes('team_members')) {
        const members = await dataSource.query(`
          SELECT tm.team_id, tm.user_id, tm.role, tm.status, t.name as team_name, u.email as user_email
          FROM "team_members" tm
          LEFT JOIN "teams" t ON tm.team_id = t.id
          LEFT JOIN "users" u ON tm.user_id = u.id
          LIMIT 10
        `);
        console.log(`   ✅ 找到 ${members.length} 个团队成员记录:`);
        members.forEach((member: any) => {
          console.log(`      - ${member.user_email} 在 ${member.team_name} 中，角色: ${member.role}, 状态: ${member.status}`);
        });
      } else {
        console.log('   ❌ team_members 表不存在');
      }
    } catch (error: any) {
      console.log(`   ❌ 检查团队成员失败: ${error.message}`);
    }

    // 检查项目的 team_id
    try {
      if (existingTables.includes('projects')) {
        const projectsWithTeam = await dataSource.query(`
          SELECT COUNT(*) as count FROM "projects" WHERE team_id IS NOT NULL
        `);
        const projectsWithoutTeam = await dataSource.query(`
          SELECT COUNT(*) as count FROM "projects" WHERE team_id IS NULL
        `);
        const withTeam = parseInt(projectsWithTeam[0]?.count || '0');
        const withoutTeam = parseInt(projectsWithoutTeam[0]?.count || '0');
        console.log(`   ✅ 项目 team_id 关联情况:`);
        console.log(`      - 有 team_id: ${withTeam} 个`);
        console.log(`      - 无 team_id: ${withoutTeam} 个`);
        if (withoutTeam > 0) {
          console.log(`   ⚠️  有 ${withoutTeam} 个项目没有关联团队，需要迁移`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ 检查项目关联失败: ${error.message}`);
    }
    console.log('');

    // ============================================
    // 7. 检查 RLS 策略
    // ============================================
    console.log('7️⃣ 检查 RLS (Row Level Security) 策略...');
    try {
      const rlsStatus = await dataSource.query(`
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('teams', 'team_members', 'projects', 'videos')
        ORDER BY tablename;
      `);
      
      rlsStatus.forEach((table: any) => {
        if (table.rls_enabled) {
          console.log(`   ✅ ${table.tablename}: RLS 已启用`);
        } else {
          console.log(`   ⚠️  ${table.tablename}: RLS 未启用`);
        }
      });

      // 检查策略数量
      const policies = await dataSource.query(`
        SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public'
      `);
      const policyCount = parseInt(policies[0]?.count || '0');
      console.log(`   ✅ 共有 ${policyCount} 个 RLS 策略`);
    } catch (error: any) {
      console.log(`   ⚠️  检查 RLS 失败: ${error.message}`);
    }
    console.log('');

    // ============================================
    // 8. 检查枚举类型
    // ============================================
    console.log('8️⃣ 检查枚举类型...');
    try {
      const enums = await dataSource.query(`
        SELECT t.typname as enum_name, 
               string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname IN ('team_role_enum', 'member_status_enum', 'project_status_enum')
        GROUP BY t.typname
        ORDER BY t.typname;
      `);
      
      if (enums.length > 0) {
        enums.forEach((enumType: any) => {
          console.log(`   ✅ ${enumType.enum_name}: ${enumType.enum_values}`);
        });
      } else {
        console.log('   ⚠️  未找到预期的枚举类型');
      }
    } catch (error: any) {
      console.log(`   ⚠️  检查枚举类型失败: ${error.message}`);
    }
    console.log('');

    // ============================================
    // 9. 生成诊断报告
    // ============================================
    console.log('9️⃣ 生成诊断报告...');
    const report = {
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        tables: existingTables.length,
        missingTables: missingTables,
      },
      data: {
        users: 0,
        teams: 0,
        teamMembers: 0,
        projects: 0,
        videos: 0,
      },
      migrations: {
        files: migrationFiles.filter(f => fs.existsSync(path.join(migrationDir, f))).length,
        total: migrationFiles.length,
      },
      seeds: {
        files: seedFiles.filter(f => fs.existsSync(path.join(migrationDir, f))).length,
        total: seedFiles.length,
      }
    };

    // 获取数据量
    try {
      const usersCount = await dataSource.query('SELECT COUNT(*) as count FROM "users"');
      report.data.users = parseInt(usersCount[0]?.count || '0');
    } catch {}
    
    try {
      if (existingTables.includes('teams')) {
        const teamsCount = await dataSource.query('SELECT COUNT(*) as count FROM "teams"');
        report.data.teams = parseInt(teamsCount[0]?.count || '0');
      }
    } catch {}
    
    try {
      if (existingTables.includes('team_members')) {
        const membersCount = await dataSource.query('SELECT COUNT(*) as count FROM "team_members"');
        report.data.teamMembers = parseInt(membersCount[0]?.count || '0');
      }
    } catch {}
    
    try {
      const projectsCount = await dataSource.query('SELECT COUNT(*) as count FROM "projects"');
      report.data.projects = parseInt(projectsCount[0]?.count || '0');
    } catch {}
    
    try {
      const videosCount = await dataSource.query('SELECT COUNT(*) as count FROM "videos"');
      report.data.videos = parseInt(videosCount[0]?.count || '0');
    } catch {}

    console.log('   📊 诊断报告:');
    console.log(JSON.stringify(report, null, 2));
    console.log('');

    await dataSource.destroy();
    console.log('✅ 全面检查完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

checkAll();

