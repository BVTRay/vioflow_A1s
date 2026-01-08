import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import axios from 'axios';

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
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function testTeamsAPI() {
  try {
    console.log('🧪 测试团队 API...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 获取一个用户和其团队
    const users = await dataSource.query('SELECT id, email FROM "users" LIMIT 1');
    if (users.length === 0) {
      console.log('❌ 没有找到用户');
      process.exit(1);
    }

    const user = users[0];
    console.log(`📋 测试用户: ${user.email} (${user.id})\n`);

    // 2. 查询该用户的团队
    const teams = await dataSource.query(`
      SELECT t.* 
      FROM "teams" t
      JOIN "team_members" tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND tm.status = 'active'
    `, [user.id]);

    console.log(`✅ 数据库查询结果: 找到 ${teams.length} 个团队`);
    if (teams.length > 0) {
      teams.forEach((team: any) => {
        console.log(`   - ${team.name} (${team.code})`);
      });
    }
    console.log('');

    // 3. 测试后端 API（需要先登录获取 token）
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3002';
    console.log(`🌐 测试 API: ${API_BASE}/api/teams\n`);

    try {
      // 先登录获取 token（使用 username 字段，可以是邮箱）
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        username: user.email, // 登录 API 使用 username 字段
        password: 'admin', // 默认密码
      });

      if (loginResponse.data && (loginResponse.data.token || loginResponse.data.accessToken)) {
        const token = loginResponse.data.token || loginResponse.data.accessToken;
        console.log('✅ 登录成功，获取到 token\n');

        // 调用团队 API
        const teamsResponse = await axios.get(`${API_BASE}/api/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('✅ API 调用成功:');
        console.log(`   状态码: ${teamsResponse.status}`);
        console.log(`   返回团队数: ${teamsResponse.data?.length || 0}`);
        if (teamsResponse.data && teamsResponse.data.length > 0) {
          teamsResponse.data.forEach((team: any) => {
            console.log(`   - ${team.name} (${team.code})`);
          });
        }
      } else {
        console.log('⚠️  登录失败: 未返回 token');
        console.log('   响应:', loginResponse.data);
      }
    } catch (apiError: any) {
      if (apiError.response) {
        console.log('❌ API 调用失败:');
        console.log(`   状态码: ${apiError.response.status}`);
        console.log(`   错误信息: ${apiError.response.data?.message || apiError.response.statusText}`);
        console.log(`   响应数据:`, JSON.stringify(apiError.response.data, null, 2));
      } else if (apiError.request) {
        console.log('❌ API 请求失败: 无法连接到服务器');
        console.log(`   请确保后端服务运行在 ${API_BASE}`);
      } else {
        console.log('❌ API 错误:', apiError.message);
      }
    }

    await dataSource.destroy();
    console.log('\n✅ 测试完成');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

testTeamsAPI();

