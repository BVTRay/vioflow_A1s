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

async function clearDuplicatePhone() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    const tempUserId = '88d9dc1a-50ff-4032-9449-2be1246f122f';
    const tempEmail = '18810250389@temp.vioflow.com';
    
    console.log(`准备清空临时用户的手机号: ${tempUserId} (${tempEmail})`);
    
    // 清空临时用户的手机号
    await dataSource.query(`
      UPDATE users SET phone = NULL WHERE id = $1
    `, [tempUserId]);
    console.log(`✓ 已清空临时用户的手机号`);
    
    // 验证只有 Jeff 用户有这个手机号
    const usersWithPhone = await dataSource.query(`
      SELECT id, name, email, phone 
      FROM users 
      WHERE phone = '18810250389'
    `);
    
    console.log('\n验证结果:');
    if (usersWithPhone.length === 1) {
      const user = usersWithPhone[0];
      console.log(`✓ 手机号 18810250389 现在唯一关联到:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  邮箱: ${user.email}`);
    } else if (usersWithPhone.length === 0) {
      console.log(`⚠️ 没有用户使用该手机号`);
    } else {
      console.log(`⚠️ 发现 ${usersWithPhone.length} 个用户使用该手机号`);
      usersWithPhone.forEach((u: any) => {
        console.log(`  - ${u.name} (${u.email})`);
      });
    }
    
    // 显示临时用户的当前状态
    const tempUser = await dataSource.query(`
      SELECT id, name, email, phone FROM users WHERE id = $1
    `, [tempUserId]);
    
    if (tempUser.length > 0) {
      console.log('\n临时用户状态:');
      console.log(`  ID: ${tempUser[0].id}`);
      console.log(`  姓名: ${tempUser[0].name}`);
      console.log(`  邮箱: ${tempUser[0].email}`);
      console.log(`  手机: ${tempUser[0].phone || '(无)'}`);
    }
    
    await dataSource.destroy();
    console.log('\n✓ 修复完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 修复失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

clearDuplicatePhone();


