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

async function checkDatabase() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 检查表是否存在
    console.log('检查数据库表...');
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`✓ 找到 ${tables.length} 个表:`);
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    console.log('');

    // 检查各表的数据量
    console.log('检查数据量...');
    const tablesToCheck = ['users', 'projects', 'videos', 'tags', 'project_members', 'deliveries', 'notifications'];
    
    for (const tableName of tablesToCheck) {
      try {
        const result = await dataSource.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const count = result[0]?.count || 0;
        console.log(`  ${tableName}: ${count} 条记录`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`  ${tableName}: 表不存在`);
        } else {
          console.log(`  ${tableName}: 检查失败 - ${error.message}`);
        }
      }
    }

    // 检查用户数据
    console.log('\n检查用户数据...');
    try {
      const userCount = await dataSource.query('SELECT COUNT(*) as count FROM "users"');
      const totalUsers = parseInt(userCount[0]?.count || '0');
      const users = await dataSource.query('SELECT email, name, role FROM "users" ORDER BY created_at LIMIT 10');
      if (users.length > 0) {
        console.log(`✓ 找到 ${totalUsers} 个用户（显示前 ${users.length} 个）:`);
        users.forEach((user: any) => {
          console.log(`  - ${user.email} (${user.name}) - ${user.role}`);
        });
        if (totalUsers > users.length) {
          console.log(`  ... 还有 ${totalUsers - users.length} 个用户未显示`);
        }
      } else {
        console.log('⚠️  用户表为空');
      }
    } catch (error: any) {
      console.log(`✗ 无法查询用户表: ${error.message}`);
    }

    // 检查项目数据
    console.log('\n检查项目数据...');
    try {
      const projectCount = await dataSource.query('SELECT COUNT(*) as count FROM "projects"');
      const totalProjects = parseInt(projectCount[0]?.count || '0');
      const projects = await dataSource.query('SELECT name, client, status FROM "projects" ORDER BY created_at DESC LIMIT 15');
      if (projects.length > 0) {
        console.log(`✓ 找到 ${totalProjects} 个项目（显示前 ${projects.length} 个）:`);
        projects.forEach((project: any) => {
          console.log(`  - ${project.name} (${project.client}) - ${project.status}`);
        });
        if (totalProjects > projects.length) {
          console.log(`  ... 还有 ${totalProjects - projects.length} 个项目未显示`);
        }
      } else {
        console.log('⚠️  项目表为空');
      }
    } catch (error: any) {
      console.log(`✗ 无法查询项目表: ${error.message}`);
    }

    // 检查标签数据
    console.log('\n检查标签数据...');
    try {
      const tagCount = await dataSource.query('SELECT COUNT(*) as count FROM "tags"');
      const totalTags = parseInt(tagCount[0]?.count || '0');
      const tags = await dataSource.query('SELECT name, usage_count FROM "tags" ORDER BY usage_count DESC LIMIT 20');
      if (tags.length > 0) {
        console.log(`✓ 找到 ${totalTags} 个标签（显示前 ${tags.length} 个）:`);
        tags.forEach((tag: any) => {
          console.log(`  - ${tag.name} (使用次数: ${tag.usage_count})`);
        });
        if (totalTags > tags.length) {
          console.log(`  ... 还有 ${totalTags - tags.length} 个标签未显示`);
        }
      } else {
        console.log('⚠️  标签表为空');
      }
    } catch (error: any) {
      console.log(`✗ 无法查询标签表: ${error.message}`);
    }

    await dataSource.destroy();
    console.log('\n✓ 数据库检查完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 数据库检查失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n请确保数据库服务已启动');
    } else if (error.message.includes('password authentication')) {
      console.error('\n请检查数据库密码是否正确');
    } else if (error.message.includes('does not exist')) {
      console.error('\n请检查数据库名称是否正确');
    }
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

checkDatabase();

