import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

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
  type: 'postgres',
  synchronize: false,
  logging: true,
});

async function addWechatFields() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功');
    
    console.log('开始添加微信字段...');
    
    // 执行 SQL 迁移
    await dataSource.query(`
      ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "wechat_openid" varchar(100),
        ADD COLUMN IF NOT EXISTS "wechat_unionid" varchar(100),
        ADD COLUMN IF NOT EXISTS "wechat_session_key" varchar(200);
    `);
    
    console.log('✓ 微信字段添加成功');
    
    // 创建索引
    console.log('开始创建索引...');
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_wechat_openid" ON "users"("wechat_openid");
    `);
    
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_wechat_unionid" ON "users"("wechat_unionid");
    `);
    
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users"("phone");
    `);
    
    console.log('✓ 索引创建成功');
    
    await dataSource.destroy();
    console.log('✓ 迁移完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 迁移失败:', error.message);
    console.error(error.stack);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

addWechatFields();




