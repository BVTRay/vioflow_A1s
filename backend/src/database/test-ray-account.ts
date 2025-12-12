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

async function testRayAccount() {
  try {
    console.log('🧪 测试 ray 账号...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查 ray 用户
    const ray = await dataSource.query(`
      SELECT id, email, name, role, is_active
      FROM "users"
      WHERE email = 'ray@bugong.com'
    `);

    if (ray.length === 0) {
      console.log('❌ ray 用户不存在');
      process.exit(1);
    }

    console.log('✅ ray 用户信息:');
    console.log(`   ID: ${ray[0].id}`);
    console.log(`   邮箱: ${ray[0].email}`);
    console.log(`   姓名: ${ray[0].name}`);
    console.log(`   角色: ${ray[0].role}`);
    console.log(`   状态: ${ray[0].is_active ? '活跃' : '禁用'}\n`);

    // 2. 检查 ray 的团队成员关系
    const teamMembers = await dataSource.query(`
      SELECT tm.id, tm.team_id, tm.role, tm.status, t.name as team_name, t.code as team_code
      FROM "team_members" tm
      JOIN "teams" t ON tm.team_id = t.id
      WHERE tm.user_id = $1
    `, [ray[0].id]);

    console.log(`✅ ray 的团队成员关系: ${teamMembers.length} 条`);
    teamMembers.forEach((tm: any) => {
      console.log(`   - 团队: ${tm.team_name} (${tm.team_code})`);
      console.log(`     角色: ${tm.role}`);
      console.log(`     状态: ${tm.status}`);
    });
    console.log('');

    // 3. 检查不恭文化团队
    const bugongTeam = await dataSource.query(`
      SELECT id, name, code FROM "teams" WHERE name = '不恭文化'
    `);

    if (bugongTeam.length === 0) {
      console.log('❌ 不恭文化团队不存在');
      process.exit(1);
    }

    console.log('✅ 不恭文化团队:');
    console.log(`   ID: ${bugongTeam[0].id}`);
    console.log(`   名称: ${bugongTeam[0].name}`);
    console.log(`   编码: ${bugongTeam[0].code}\n`);

    // 4. 检查 ray 是否在不恭文化团队中
    const rayInBugong = teamMembers.find((tm: any) => tm.team_id === bugongTeam[0].id);
    if (!rayInBugong) {
      console.log('❌ ray 不在不恭文化团队中！');
      console.log('💡 需要将 ray 添加到不恭文化团队\n');
    } else {
      console.log('✅ ray 在不恭文化团队中');
      console.log(`   角色: ${rayInBugong.role}`);
      console.log(`   状态: ${rayInBugong.status}\n`);
    }

    // 5. 检查不恭文化团队的项目
    const projects = await dataSource.query(`
      SELECT COUNT(*) as count FROM "projects" WHERE team_id = $1
    `, [bugongTeam[0].id]);

    console.log(`✅ 不恭文化团队项目数: ${projects[0].count}\n`);

    // 6. 测试 API
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:3002';
    console.log(`🌐 测试 API: ${API_BASE}/api/teams\n`);

    try {
      // 登录
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        username: 'ray@bugong.com',
        password: 'admin',
      });

      if (loginResponse.data && (loginResponse.data.token || loginResponse.data.accessToken)) {
        const token = loginResponse.data.token || loginResponse.data.accessToken;
        console.log('✅ 登录成功\n');

        // 获取团队列表
        const teamsResponse = await axios.get(`${API_BASE}/api/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('✅ API 返回团队:');
        console.log(`   状态码: ${teamsResponse.status}`);
        console.log(`   团队数: ${teamsResponse.data?.length || 0}`);
        if (teamsResponse.data && teamsResponse.data.length > 0) {
          teamsResponse.data.forEach((team: any) => {
            console.log(`   - ${team.name} (${team.code})`);
          });
        } else {
          console.log('   ⚠️  没有返回任何团队！');
        }

        // 如果有团队，测试获取项目
        if (teamsResponse.data && teamsResponse.data.length > 0) {
          const currentTeam = teamsResponse.data[0];
          console.log(`\n📡 测试获取项目 (团队: ${currentTeam.name})...`);
          
          const projectsResponse = await axios.get(`${API_BASE}/api/projects`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Team-Id': currentTeam.id,
            },
            params: {
              teamId: currentTeam.id,
            },
          });

          console.log(`✅ API 返回项目:`);
          console.log(`   状态码: ${projectsResponse.status}`);
          console.log(`   项目数: ${projectsResponse.data?.length || 0}`);
          if (projectsResponse.data && projectsResponse.data.length > 0) {
            projectsResponse.data.slice(0, 5).forEach((project: any) => {
              console.log(`   - ${project.name}`);
            });
            if (projectsResponse.data.length > 5) {
              console.log(`   ... 还有 ${projectsResponse.data.length - 5} 个项目`);
            }
          }
        }
      } else {
        console.log('⚠️  登录失败: 未返回 token');
      }
    } catch (apiError: any) {
      if (apiError.response) {
        console.log('❌ API 调用失败:');
        console.log(`   状态码: ${apiError.response.status}`);
        console.log(`   错误: ${apiError.response.data?.message || apiError.response.statusText}`);
        console.log(`   响应:`, JSON.stringify(apiError.response.data, null, 2));
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

testRayAccount();

