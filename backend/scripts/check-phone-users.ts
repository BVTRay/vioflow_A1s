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

async function checkPhoneUsers() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 查找所有手机号为 18810250389 的用户
    const users = await dataSource.query(`
      SELECT id, name, email, phone, role, is_active, created_at 
      FROM users 
      WHERE phone = '18810250389'
      ORDER BY created_at DESC
    `);
    
    console.log(`找到 ${users.length} 个手机号为 18810250389 的用户:\n`);
    
    for (const user of users) {
      console.log('─────────────────────────────────────');
      console.log(`用户 ID: ${user.id}`);
      console.log(`姓名: ${user.name}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`手机: ${user.phone}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.is_active ? '激活' : '未激活'}`);
      console.log(`创建时间: ${user.created_at}`);
      
      // 查找该用户所属的团队
      const teamMembers = await dataSource.query(`
        SELECT t.name as team_name, tm.role as team_role
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1
      `, [user.id]);
      
      if (teamMembers.length > 0) {
        console.log('所属团队:');
        teamMembers.forEach((tm: any) => {
          console.log(`  - ${tm.team_name} (${tm.team_role})`);
        });
      } else {
        console.log('所属团队: 无');
      }
    }
    
    console.log('─────────────────────────────────────\n');
    
    // 查找 jeff@bugong.com 用户
    const jeffUser = await dataSource.query(`
      SELECT id, name, email, phone, role, is_active 
      FROM users 
      WHERE email = 'jeff@bugong.com'
    `);
    
    if (jeffUser.length > 0) {
      console.log('Jeff 用户信息:');
      console.log(`  ID: ${jeffUser[0].id}`);
      console.log(`  姓名: ${jeffUser[0].name}`);
      console.log(`  邮箱: ${jeffUser[0].email}`);
      console.log(`  手机: ${jeffUser[0].phone || '无'}`);
      console.log(`  角色: ${jeffUser[0].role}`);
      console.log(`  状态: ${jeffUser[0].is_active ? '激活' : '未激活'}\n`);
    }
    
    await dataSource.destroy();
    console.log('✓ 完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 检查失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkPhoneUsers();


