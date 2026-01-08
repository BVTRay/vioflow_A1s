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

async function updateJeffPhone() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功');

    // 查找 Jeff 用户
    const jeffUsers = await dataSource.query(`
      SELECT id, name, email, phone FROM users WHERE name LIKE '%Jeff%' OR email LIKE '%jeff%' LIMIT 5
    `);
    
    console.log('找到的用户:', jeffUsers);
    
    if (jeffUsers.length === 0) {
      console.log('未找到 Jeff 用户');
      await dataSource.destroy();
      process.exit(0);
      return;
    }
    
    // 更新第一个匹配的用户
    const userId = jeffUsers[0].id;
    await dataSource.query(`
      UPDATE users SET phone = $1 WHERE id = $2
    `, ['18810250389', userId]);
    
    console.log(`✓ 已更新用户 ${jeffUsers[0].name} (${jeffUsers[0].email}) 的手机号为 18810250389`);
    
    await dataSource.destroy();
    console.log('✓ 完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 更新失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

updateJeffPhone();


