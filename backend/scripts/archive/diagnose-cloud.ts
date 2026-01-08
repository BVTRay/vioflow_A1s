import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

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

async function diagnoseCloud() {
  try {
    console.log('🔍 开始诊断云端数据库...\n');
    
    // 检查环境变量
    console.log('1️⃣ 检查环境变量:');
    if (databaseUrl) {
      const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
      console.log(`   ✓ DATABASE_URL 已配置: ${maskedUrl}`);
      if (databaseUrl.includes('supabase')) {
        console.log('   ✓ 检测到 Supabase 连接');
      }
    } else {
      console.log('   ✗ DATABASE_URL 未配置');
      console.log('   ℹ 使用单独的环境变量配置');
    }
    console.log('');

    // 连接数据库
    console.log('2️⃣ 连接数据库...');
    await dataSource.initialize();
    console.log('   ✓ 数据库连接成功\n');

    // 检查表是否存在
    console.log('3️⃣ 检查数据库表结构...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const expectedTables = [
      'users', 'projects', 'videos', 'tags', 'project_members',
      'video_tags', 'deliveries', 'delivery_folders', 'delivery_files',
      'delivery_packages', 'delivery_package_files', 'showcase_packages',
      'showcase_package_videos', 'annotations', 'share_links',
      'notifications', 'upload_tasks', 'archiving_tasks', 'view_tracking'
    ];
    
    const existingTables = tables.map((t: any) => t.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    
    console.log(`   ✓ 找到 ${tables.length} 个表`);
    if (missingTables.length > 0) {
      console.log(`   ⚠️  缺少以下表: ${missingTables.join(', ')}`);
      console.log('   ℹ 建议运行 init-schema.sql 初始化数据库');
    } else {
      console.log('   ✓ 所有必需的表都存在');
    }
    console.log('');

    // 检查各表的数据量
    console.log('4️⃣ 检查数据量:');
    const tablesToCheck = [
      'users', 'projects', 'videos', 'tags', 'project_members',
      'video_tags', 'deliveries', 'delivery_folders', 'delivery_files',
      'delivery_packages', 'showcase_packages', 'annotations',
      'notifications'
    ];
    
    let hasData = false;
    for (const tableName of tablesToCheck) {
      try {
        if (existingTables.includes(tableName)) {
          const result = await dataSource.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const count = parseInt(result[0]?.count || '0');
          const status = count > 0 ? '✓' : '⚠️';
          console.log(`   ${status} ${tableName}: ${count} 条记录`);
          if (count > 0) hasData = true;
        } else {
          console.log(`   ✗ ${tableName}: 表不存在`);
        }
      } catch (error: any) {
        console.log(`   ✗ ${tableName}: 检查失败 - ${error.message}`);
      }
    }
    console.log('');

    // 诊断结果
    console.log('📊 诊断结果:');
    if (missingTables.length > 0) {
      console.log('   ❌ 数据库表结构不完整');
      console.log('   💡 解决方案: 在 Supabase SQL Editor 中运行 init-schema.sql');
    } else if (!hasData) {
      console.log('   ⚠️  数据库表结构完整，但没有数据');
      console.log('   💡 解决方案: 在 Supabase SQL Editor 中运行 seed-data-fixed.sql');
      console.log('   📝 脚本位置: backend/src/database/seed-data-fixed.sql');
    } else {
      console.log('   ✓ 数据库连接正常，表结构完整，有数据');
    }
    console.log('');

    // 检查用户数据
    if (existingTables.includes('users')) {
      console.log('5️⃣ 检查用户数据:');
      try {
        const userCount = await dataSource.query('SELECT COUNT(*) as count FROM "users"');
        const totalUsers = parseInt(userCount[0]?.count || '0');
        if (totalUsers > 0) {
          const users = await dataSource.query('SELECT email, name, role FROM "users" ORDER BY created_at LIMIT 5');
          console.log(`   ✓ 找到 ${totalUsers} 个用户（显示前 ${users.length} 个）:`);
          users.forEach((user: any) => {
            console.log(`     - ${user.email} (${user.name}) - ${user.role}`);
          });
        } else {
          console.log('   ⚠️  用户表为空');
          console.log('   💡 需要运行种子数据脚本创建用户');
        }
      } catch (error: any) {
        console.log(`   ✗ 无法查询用户表: ${error.message}`);
      }
      console.log('');
    }

    // 检查项目数据
    if (existingTables.includes('projects')) {
      console.log('6️⃣ 检查项目数据:');
      try {
        const projectCount = await dataSource.query('SELECT COUNT(*) as count FROM "projects"');
        const totalProjects = parseInt(projectCount[0]?.count || '0');
        if (totalProjects > 0) {
          const projects = await dataSource.query(`
            SELECT name, client, status, created_date 
            FROM "projects" 
            ORDER BY created_at DESC 
            LIMIT 10
          `);
          console.log(`   ✓ 找到 ${totalProjects} 个项目（显示前 ${projects.length} 个）:`);
          projects.forEach((project: any) => {
            console.log(`     - ${project.name} (${project.client}) - ${project.status}`);
          });
        } else {
          console.log('   ⚠️  项目表为空');
          console.log('   💡 需要运行种子数据脚本创建项目');
        }
      } catch (error: any) {
        console.log(`   ✗ 无法查询项目表: ${error.message}`);
      }
      console.log('');
    }

    await dataSource.destroy();
    console.log('✅ 诊断完成');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 诊断失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 请确保数据库服务可访问');
      console.error('   检查 DATABASE_URL 是否正确');
    } else if (error.message.includes('password authentication')) {
      console.error('\n💡 请检查数据库密码是否正确');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 请检查数据库名称是否正确');
    } else if (error.message.includes('SSL')) {
      console.error('\n💡 SSL 连接问题，检查 Supabase 连接配置');
    }
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

diagnoseCloud();



