import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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

// 生成8-12位团队编码
function generateTeamCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8 + Math.floor(Math.random() * 5); // 8-12位
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createTeamAndUsers() {
  try {
    console.log('🚀 开始创建团队和用户...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 创建用户
    console.log('1️⃣ 创建用户...');
    const passwordHash = await bcrypt.hash('admin', 10);
    
    const users = [
      { email: 'ray@bugong.com', name: 'ray', role: 'admin' },
      { email: 'jeff@bugong.com', name: 'jeff', role: 'admin' },
      { email: 'bevis@bugong.com', name: 'bevis', role: 'member' },
    ];

    const createdUsers = [];
    for (const userData of users) {
      // 检查用户是否已存在
      const existing = await dataSource.query(
        'SELECT id FROM "users" WHERE email = $1',
        [userData.email]
      );

      if (existing.length > 0) {
        console.log(`   ⏭️  用户 ${userData.email} 已存在，跳过创建`);
        createdUsers.push(existing[0]);
      } else {
        const result = await dataSource.query(`
          INSERT INTO "users" (email, name, password_hash, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, now(), now())
          RETURNING id, email, name, role
        `, [userData.email, userData.name, passwordHash, userData.role, true]);
        
        console.log(`   ✅ 创建用户: ${userData.name} (${userData.email}) - ${userData.role}`);
        createdUsers.push(result[0]);
      }
    }
    console.log('');

    // 2. 创建团队
    console.log('2️⃣ 创建团队...');
    const teamName = '不恭文化';
    
    // 检查团队是否已存在
    const existingTeam = await dataSource.query(
      'SELECT id FROM "teams" WHERE name = $1',
      [teamName]
    );

    let teamId;
    if (existingTeam.length > 0) {
      console.log(`   ⏭️  团队 "${teamName}" 已存在，使用现有团队`);
      teamId = existingTeam[0].id;
    } else {
      // 生成唯一的团队编码
      let teamCode = generateTeamCode();
      let codeExists = true;
      while (codeExists) {
        const check = await dataSource.query('SELECT id FROM "teams" WHERE code = $1', [teamCode]);
        if (check.length === 0) {
          codeExists = false;
        } else {
          teamCode = generateTeamCode();
        }
      }

      const rayUser = createdUsers.find(u => u.email === 'ray@bugong.com');
      if (!rayUser) {
        throw new Error('ray 用户未创建成功');
      }

      const result = await dataSource.query(`
        INSERT INTO "teams" (name, code, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now(), now())
        RETURNING id, name, code
      `, [teamName, teamCode, '不恭文化团队', rayUser.id]);

      teamId = result[0].id;
      console.log(`   ✅ 创建团队: ${result[0].name} (编码: ${result[0].code})`);
    }
    console.log('');

    // 3. 添加团队成员
    console.log('3️⃣ 添加团队成员...');
    
    const rayUser = createdUsers.find(u => u.email === 'ray@bugong.com');
    const jeffUser = createdUsers.find(u => u.email === 'jeff@bugong.com');
    const bevisUser = createdUsers.find(u => u.email === 'bevis@bugong.com');

    const members = [
      { user: rayUser, role: 'super_admin', name: 'ray' },
      { user: jeffUser, role: 'admin', name: 'jeff' },
      { user: bevisUser, role: 'member', name: 'bevis' },
    ];

    for (const member of members) {
      // 检查是否已是团队成员
      const existing = await dataSource.query(`
        SELECT id FROM "team_members" WHERE team_id = $1 AND user_id = $2
      `, [teamId, member.user.id]);

      if (existing.length > 0) {
        // 更新角色和状态
        await dataSource.query(`
          UPDATE "team_members"
          SET role = $1, status = 'active', updated_at = now()
          WHERE team_id = $2 AND user_id = $3
        `, [member.role, teamId, member.user.id]);
        console.log(`   ✅ 更新成员: ${member.name} - ${member.role}`);
      } else {
        await dataSource.query(`
          INSERT INTO "team_members" (team_id, user_id, role, status, joined_at, created_at, updated_at)
          VALUES ($1, $2, $3, 'active', now(), now(), now())
        `, [teamId, member.user.id, member.role]);
        console.log(`   ✅ 添加成员: ${member.name} - ${member.role}`);
      }
    }
    console.log('');

    // 4. 初始化存储使用统计
    console.log('4️⃣ 初始化存储使用统计...');
    const existingStorage = await dataSource.query(
      'SELECT id FROM "storage_usage" WHERE team_id = $1',
      [teamId]
    );

    if (existingStorage.length === 0) {
      await dataSource.query(`
        INSERT INTO "storage_usage" (team_id, total_size, standard_size, cold_size, file_count, updated_at)
        VALUES ($1, 0, 0, 0, 0, now())
      `, [teamId]);
      console.log('   ✅ 初始化存储统计');
    } else {
      console.log('   ⏭️  存储统计已存在');
    }
    console.log('');

    // 5. 生成报告
    console.log('5️⃣ 生成创建报告...');
    const teamInfo = await dataSource.query('SELECT name, code FROM "teams" WHERE id = $1', [teamId]);
    const teamMembers = await dataSource.query(`
      SELECT u.email, u.name, tm.role, tm.status
      FROM "team_members" tm
      JOIN "users" u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY 
        CASE tm.role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'member' THEN 3
        END
    `, [teamId]);

    console.log('\n📊 创建结果:');
    console.log(`   团队: ${teamInfo[0].name} (编码: ${teamInfo[0].code})`);
    console.log(`   成员数: ${teamMembers.length}`);
    console.log('\n   成员列表:');
    teamMembers.forEach((member: any) => {
      console.log(`     - ${member.name} (${member.email})`);
      console.log(`       角色: ${member.role === 'super_admin' ? '超级管理员' : member.role === 'admin' ? '管理员' : '普通用户'}`);
      console.log(`       状态: ${member.status === 'active' ? '活跃' : member.status}`);
    });
    console.log('\n   登录信息:');
    teamMembers.forEach((member: any) => {
      console.log(`     - ${member.email} / admin`);
    });
    console.log('');

    await dataSource.destroy();
    console.log('✅ 创建完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

createTeamAndUsers();


