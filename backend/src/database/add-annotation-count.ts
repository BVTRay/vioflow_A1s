import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 加载环境变量
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
  synchronize: false,
  logging: true,
});

async function addAnnotationCount() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, 'add-annotation-count.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('正在执行 SQL 迁移...');
    console.log('文件:', sqlPath);
    console.log('');

    // 执行 SQL
    await dataSource.query(sql);
    
    console.log('✓ 迁移执行成功！');
    console.log('');
    console.log('已添加 annotation_count 列到 videos 表');
    console.log('已更新现有记录的 annotation_count 值');
    
  } catch (error: any) {
    console.error('✗ 迁移执行失败:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

addAnnotationCount();

