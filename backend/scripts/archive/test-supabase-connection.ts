import { DataSource } from 'typeorm';
import * as path from 'path';

// Supabase 连接字符串（从用户提供的信息）
// 注意：需要替换 [YOUR-PASSWORD] 为实际密码
const supabaseUrl = process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres.bejrwnamnxxdxoqwoxag:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

async function testSupabaseConnection() {
  try {
    console.log('🔍 测试 Supabase 数据库连接...\n');
    
    // 解析连接字符串
    const urlObj = new URL(supabaseUrl);
    
    const dataSourceConfig = {
      type: 'postgres' as const,
      host: urlObj.hostname,
      port: parseInt(urlObj.port, 10) || 5432,
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      database: urlObj.pathname.slice(1),
      ssl: {
        rejectUnauthorized: false,
      },
    };
    
    // 显示连接信息（隐藏密码）
    const maskedUrl = supabaseUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`📌 Supabase 连接字符串: ${maskedUrl}`);
    console.log(`   Host: ${dataSourceConfig.host}`);
    console.log(`   Port: ${dataSourceConfig.port}`);
    console.log(`   Database: ${dataSourceConfig.database}`);
    console.log(`   Username: ${dataSourceConfig.username}`);
    console.log(`   SSL: 启用\n`);
    
    const dataSource = new DataSource({
      ...dataSourceConfig,
      entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
    });
    
    console.log('🔌 正在连接 Supabase...');
    await dataSource.initialize();
    console.log('✅ Supabase 连接成功！\n');
    
    // 检查 users 表
    console.log('📊 检查 Supabase users 表数据...');
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
    console.log('\n📊 检查 Supabase teams 表数据...');
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
    
    // 检查是否有"不恭文化"团队
    console.log('\n🔍 在 Supabase 中搜索"不恭文化"团队...');
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
    console.log('\n📈 Supabase 数据库统计信息:');
    const userCount = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const teamCount = await dataSource.query('SELECT COUNT(*) as count FROM teams');
    const teamMemberCount = await dataSource.query('SELECT COUNT(*) as count FROM team_members');
    console.log(`   用户总数: ${userCount[0].count}`);
    console.log(`   团队总数: ${teamCount[0].count}`);
    console.log(`   团队成员关系总数: ${teamMemberCount[0].count}`);
    
    await dataSource.destroy();
    console.log('\n✅ Supabase 检查完成！');
    
  } catch (error: any) {
    console.error('\n❌ Supabase 连接失败:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    if (error.message.includes('password')) {
      console.error('\n💡 提示: 请确保在环境变量 SUPABASE_DATABASE_URL 中设置了正确的密码');
      console.error('   或者修改脚本中的连接字符串，将 [YOUR-PASSWORD] 替换为实际密码');
    }
    process.exit(1);
  }
}

testSupabaseConnection();


