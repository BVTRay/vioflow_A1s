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
  entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function checkConnection() {
  try {
    console.log('🔍 检查数据库连接配置...\n');
    
    // 显示连接信息（隐藏密码）
    if (databaseUrl) {
      const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
      console.log(`📌 使用 DATABASE_URL: ${maskedUrl}`);
      console.log(`   Host: ${dataSourceConfig.host}`);
      console.log(`   Port: ${dataSourceConfig.port}`);
      console.log(`   Database: ${dataSourceConfig.database}`);
      console.log(`   Username: ${dataSourceConfig.username}`);
      console.log(`   SSL: ${dataSourceConfig.ssl ? '启用' : '禁用'}`);
    } else {
      console.log('📌 使用单独的环境变量:');
      console.log(`   Host: ${dataSourceConfig.host}`);
      console.log(`   Port: ${dataSourceConfig.port}`);
      console.log(`   Database: ${dataSourceConfig.database}`);
      console.log(`   Username: ${dataSourceConfig.username}`);
    }
    
    console.log('\n🔌 正在连接数据库...');
    await dataSource.initialize();
    console.log('✅ 数据库连接成功！\n');
    
    // 检查 users 表
    console.log('📊 检查 users 表数据...');
    const users = await dataSource.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        is_active,
        team_id,
        created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log(`   找到 ${users.length} 个用户（显示前10个）:`);
    users.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - 角色: ${user.role} - 团队ID: ${user.team_id || '无'}`);
    });
    
    // 检查 teams 表
    console.log('\n📊 检查 teams 表数据...');
    const teams = await dataSource.query(`
      SELECT 
        id, 
        name, 
        code, 
        created_at
      FROM teams 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log(`   找到 ${teams.length} 个团队（显示前10个）:`);
    teams.forEach((team: any, index: number) => {
      console.log(`   ${index + 1}. ${team.name} (代码: ${team.code})`);
    });
    
    // 检查 team_members 表
    console.log('\n📊 检查 team_members 表数据...');
    const teamMembers = await dataSource.query(`
      SELECT 
        tm.id,
        tm.team_id,
        tm.user_id,
        tm.role,
        tm.status,
        t.name as team_name,
        u.name as user_name
      FROM team_members tm
      LEFT JOIN teams t ON t.id = tm.team_id
      LEFT JOIN users u ON u.id = tm.user_id
      ORDER BY tm.created_at DESC 
      LIMIT 10
    `);
    console.log(`   找到 ${teamMembers.length} 个团队成员关系（显示前10个）:`);
    teamMembers.forEach((tm: any, index: number) => {
      console.log(`   ${index + 1}. ${tm.user_name} 在团队 "${tm.team_name}" 中，角色: ${tm.role}, 状态: ${tm.status}`);
    });
    
    // 检查是否有"不恭文化"团队
    console.log('\n🔍 搜索"不恭文化"团队...');
    const bugongTeam = await dataSource.query(`
      SELECT 
        id, 
        name, 
        code, 
        created_at
      FROM teams 
      WHERE name LIKE '%不恭%' OR name LIKE '%文化%'
    `);
    if (bugongTeam.length > 0) {
      console.log(`   ✅ 找到 ${bugongTeam.length} 个相关团队:`);
      bugongTeam.forEach((team: any) => {
        console.log(`      - ${team.name} (代码: ${team.code}, ID: ${team.id})`);
      });
    } else {
      console.log('   ❌ 未找到"不恭文化"团队');
    }
    
    // 统计信息
    console.log('\n📈 数据库统计信息:');
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const teamCount = await dataSource.query('SELECT COUNT(*) as count FROM teams');
    const teamMemberCount = await dataSource.query('SELECT COUNT(*) as count FROM team_members');
    console.log(`   用户总数: ${userCount[0].count}`);
    console.log(`   团队总数: ${teamCount[0].count}`);
    console.log(`   团队成员关系总数: ${teamMemberCount[0].count}`);
    
    await dataSource.destroy();
    console.log('\n✅ 检查完成！');
    
  } catch (error: any) {
    console.error('\n❌ 数据库连接失败:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    if (error.host) {
      console.error(`   尝试连接的主机: ${error.host}`);
    }
    process.exit(1);
  }
}

checkConnection();


