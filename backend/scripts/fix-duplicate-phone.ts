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

async function fixDuplicatePhone() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    const tempUserId = '88d9dc1a-50ff-4032-9449-2be1246f122f';
    const tempEmail = '18810250389@temp.vioflow.com';
    
    console.log(`准备删除临时用户: ${tempUserId} (${tempEmail})`);
    
    // 1. 删除审计日志
    await dataSource.query(`
      DELETE FROM audit_logs WHERE user_id = $1
    `, [tempUserId]);
    console.log(`✓ 删除了审计日志`);
    
    // 2. 删除该用户的团队成员关系
    await dataSource.query(`
      DELETE FROM team_members WHERE user_id = $1
    `, [tempUserId]);
    console.log(`✓ 删除了团队成员记录`);
    
    // 3. 删除用户
    await dataSource.query(`
      DELETE FROM users WHERE id = $1
    `, [tempUserId]);
    console.log(`✓ 删除了用户: ${tempEmail}`);
    
    // 3. 验证只剩下 Jeff 用户
    const remainingUsers = await dataSource.query(`
      SELECT id, name, email, phone 
      FROM users 
      WHERE phone = '18810250389'
    `);
    
    console.log('\n验证结果:');
    if (remainingUsers.length === 1) {
      const user = remainingUsers[0];
      console.log(`✓ 手机号 18810250389 现在唯一关联到:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  邮箱: ${user.email}`);
    } else {
      console.log(`⚠️ 发现 ${remainingUsers.length} 个用户使用该手机号`);
      remainingUsers.forEach((u: any) => {
        console.log(`  - ${u.name} (${u.email})`);
      });
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

fixDuplicatePhone();

