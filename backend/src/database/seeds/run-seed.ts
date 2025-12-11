import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedDatabase } from './seed';
import * as path from 'path';

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
  entities: [path.join(__dirname, '../../**/*.entity.ts')],
  synchronize: false,
  logging: false,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');
    
    await seedDatabase(dataSource);
    
    await dataSource.destroy();
    console.log('种子数据注入完成，数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('种子数据注入失败:', error);
    process.exit(1);
  }
}

runSeed();

