import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { seedDatabase } from './seed';

// 加载环境变量
config({ path: path.join(__dirname, '../../../.env') });

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
  entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function resetAndSeed() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功');
    
    console.log('\n开始清理现有数据...');
    
    // 按依赖关系顺序删除数据（先删除有外键依赖的表）
    const tables = [
      'share_links',           // 依赖 videos 和 users
      'video_tags',            // 依赖 videos 和 tags
      'project_members',       // 依赖 projects 和 users
      'delivery_package_files', // 依赖 delivery_packages
      'delivery_packages',     // 依赖 deliveries
      'delivery_folders',      // 依赖 deliveries
      'deliveries',            // 依赖 projects
      'notifications',         // 依赖 users
      'videos',                // 依赖 projects 和 users
      'projects',               // 依赖 users
      'tags',                   // 独立表
      'users',                  // 基础表
    ];
    
    for (const table of tables) {
      try {
        await dataSource.query(`DELETE FROM "${table}"`);
        const count = await dataSource.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`✓ 已清理表: ${table} (剩余: ${count[0]?.count || 0})`);
      } catch (error: any) {
        console.log(`⚠️  清理表 ${table} 时出错: ${error.message}`);
      }
    }
    
    console.log('\n开始注入种子数据...');
    await seedDatabase(dataSource);
    
    await dataSource.destroy();
    console.log('\n✓ 数据重置和种子数据注入完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 操作失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetAndSeed();

