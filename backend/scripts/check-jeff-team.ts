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

async function checkJeffTeam() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功\n');

    // 查找 Jeff 用户
    const jeffUsers = await dataSource.query(`
      SELECT id, name, email, phone FROM users WHERE email = 'jeff@bugong.com'
    `);
    
    if (jeffUsers.length === 0) {
      console.log('未找到 Jeff 用户');
      await dataSource.destroy();
      process.exit(0);
      return;
    }
    
    const jeff = jeffUsers[0];
    console.log('找到 Jeff 用户:');
    console.log(`  ID: ${jeff.id}`);
    console.log(`  姓名: ${jeff.name}`);
    console.log(`  邮箱: ${jeff.email}`);
    console.log(`  手机: ${jeff.phone}\n`);
    
    // 查找 Jeff 所属的团队
    const teamMembers = await dataSource.query(`
      SELECT tm.*, t.name as team_name, t.id as team_id 
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.user_id = $1
    `, [jeff.id]);
    
    if (teamMembers.length === 0) {
      console.log('❌ Jeff 用户不属于任何团队');
      
      // 查找不恭文化团队
      const bugongTeam = await dataSource.query(`
        SELECT id, name FROM teams WHERE name LIKE '%不恭%'
      `);
      
      if (bugongTeam.length > 0) {
        console.log(`\n找到团队: ${bugongTeam[0].name} (${bugongTeam[0].id})`);
        console.log('是否需要将 Jeff 添加到该团队？');
      }
    } else {
      console.log('✓ Jeff 所属的团队:');
      teamMembers.forEach((tm: any) => {
        console.log(`  - ${tm.team_name} (${tm.team_id})`);
        console.log(`    角色: ${tm.role}`);
      });
    }
    
    await dataSource.destroy();
    console.log('\n✓ 完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 检查失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkJeffTeam();

