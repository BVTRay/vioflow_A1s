import { DataSource } from 'typeorm';
import * as path from 'path';
import { config } from 'dotenv';

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
  entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
  migrations: [],
  synchronize: false,
  logging: false,
});

async function addUniquePhoneConstraint() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 检查约束是否已存在
    const existingConstraint = await dataSource.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_name = 'users_phone_unique'
    `);

    if (existingConstraint.length > 0) {
      console.log('✓ 手机号唯一约束已存在');
      await dataSource.destroy();
      process.exit(0);
      return;
    }

    console.log('添加手机号唯一约束...');
    
    // 添加唯一约束（允许 NULL 值，因为不是所有用户都有手机号）
    await dataSource.query(`
      CREATE UNIQUE INDEX users_phone_unique ON users (phone) WHERE phone IS NOT NULL
    `);
    
    console.log('✓ 已添加手机号唯一约束');
    console.log('  - 约束名称: users_phone_unique');
    console.log('  - 允许 NULL 值（用户可以没有手机号）');
    console.log('  - 不允许重复的非空手机号\n');
    
    await dataSource.destroy();
    console.log('✓ 完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 添加约束失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addUniquePhoneConstraint();


