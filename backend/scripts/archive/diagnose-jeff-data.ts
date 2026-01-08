import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { User } from '../modules/users/entities/user.entity';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember } from '../modules/teams/entities/team-member.entity';
import { Project } from '../modules/projects/entities/project.entity';

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
    ssl: isSupabase ? {
      rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.DB_ALLOW_SELF_SIGNED_CERT !== 'true',
    } : undefined,
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

async function diagnoseJeffData() {
  try {
    console.log('🔍 开始诊断 jeff 账号数据问题...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 检查 jeff 账号
    console.log('1️⃣ 检查 jeff 账号信息...');
    const jeffUser = await dataSource.getRepository(User).findOne({
      where: { email: 'jeff@bugong.com' },
    });

    if (!jeffUser) {
      console.log('   ❌ jeff 账号不存在！');
      process.exit(1);
    }

    console.log(`   ✅ 找到 jeff 账号:`);
    console.log(`      - ID: ${jeffUser.id}`);
    console.log(`      - 邮箱: ${jeffUser.email}`);
    console.log(`      - 名称: ${jeffUser.name}`);
    console.log(`      - 角色: ${jeffUser.role}`);
    console.log(`      - team_id: ${jeffUser.team_id || '❌ NULL'}\n`);

    // 2. 检查不恭文化团队
    console.log('2️⃣ 检查"不恭文化"团队...');
    const bugongTeam = await dataSource.getRepository(Team).findOne({
      where: { name: '不恭文化' },
    });

    if (!bugongTeam) {
      console.log('   ❌ "不恭文化"团队不存在！');
      process.exit(1);
    }

    console.log(`   ✅ 找到"不恭文化"团队:`);
    console.log(`      - ID: ${bugongTeam.id}`);
    console.log(`      - 名称: ${bugongTeam.name}`);
    console.log(`      - 编码: ${bugongTeam.code}\n`);

    // 3. 检查 jeff 是否是团队成员
    console.log('3️⃣ 检查 jeff 的团队成员关系...');
    const jeffMember = await dataSource.getRepository(TeamMember).findOne({
      where: { 
        team_id: bugongTeam.id,
        user_id: jeffUser.id,
      },
    });

    if (!jeffMember) {
      console.log('   ❌ jeff 不是"不恭文化"团队成员！');
      console.log('   💡 需要将 jeff 添加到团队\n');
    } else {
      console.log(`   ✅ jeff 是团队成员:`);
      console.log(`      - 角色: ${jeffMember.role}`);
      console.log(`      - 状态: ${jeffMember.status}\n`);
    }

    // 4. 检查所有项目
    console.log('4️⃣ 检查项目数据...');
    const allProjects = await dataSource.getRepository(Project).find();
    console.log(`   📊 总项目数: ${allProjects.length}`);

    const projectsWithTeam = allProjects.filter(p => p.team_id);
    const projectsWithoutTeam = allProjects.filter(p => !p.team_id);
    
    console.log(`   ✅ 有 team_id 的项目: ${projectsWithTeam.length}`);
    console.log(`   ❌ 没有 team_id 的项目: ${projectsWithoutTeam.length}\n`);

    if (projectsWithoutTeam.length > 0) {
      console.log('   📋 没有 team_id 的项目列表:');
      projectsWithoutTeam.forEach(p => {
        console.log(`      - ${p.name} (ID: ${p.id})`);
      });
      console.log('');
    }

    // 5. 检查不恭文化团队的项目
    console.log('5️⃣ 检查"不恭文化"团队的项目...');
    const bugongProjects = await dataSource.getRepository(Project).find({
      where: { team_id: bugongTeam.id },
    });
    console.log(`   📊 "不恭文化"团队的项目数: ${bugongProjects.length}\n`);

    if (bugongProjects.length > 0) {
      console.log('   📋 项目列表:');
      bugongProjects.forEach(p => {
        console.log(`      - ${p.name} (${p.status})`);
      });
      console.log('');
    }

    // 6. 检查 jeff 的 team_id 是否匹配
    console.log('6️⃣ 检查数据一致性...');
    const issues: string[] = [];

    if (!jeffUser.team_id) {
      issues.push('❌ jeff 的 team_id 为 NULL');
    } else if (jeffUser.team_id !== bugongTeam.id) {
      issues.push(`❌ jeff 的 team_id (${jeffUser.team_id}) 与"不恭文化"团队 ID (${bugongTeam.id}) 不匹配`);
    }

    if (!jeffMember) {
      issues.push('❌ jeff 不是"不恭文化"团队成员');
    }

    if (projectsWithoutTeam.length > 0) {
      issues.push(`❌ 有 ${projectsWithoutTeam.length} 个项目没有 team_id`);
    }

    if (bugongProjects.length === 0) {
      issues.push('❌ "不恭文化"团队没有任何项目');
    }

    if (issues.length === 0) {
      console.log('   ✅ 所有检查通过！数据一致。\n');
    } else {
      console.log('   ⚠️  发现以下问题:\n');
      issues.forEach(issue => console.log(`      ${issue}`));
      console.log('');
    }

    // 7. 生成修复建议
    console.log('7️⃣ 修复建议:\n');
    
    if (!jeffUser.team_id || jeffUser.team_id !== bugongTeam.id) {
      console.log('   💡 需要更新 jeff 的 team_id:');
      console.log(`      UPDATE users SET team_id = '${bugongTeam.id}' WHERE email = 'jeff@bugong.com';\n`);
    }

    if (!jeffMember) {
      console.log('   💡 需要将 jeff 添加到团队:');
      console.log(`      INSERT INTO team_members (id, team_id, user_id, role, status, created_at, updated_at)`);
      console.log(`      VALUES (gen_random_uuid(), '${bugongTeam.id}', '${jeffUser.id}', 'admin', 'active', NOW(), NOW());\n`);
    }

    if (projectsWithoutTeam.length > 0) {
      console.log('   💡 需要将项目关联到"不恭文化"团队:');
      console.log(`      UPDATE projects SET team_id = '${bugongTeam.id}' WHERE team_id IS NULL;\n`);
    }

    await dataSource.destroy();
    console.log('✅ 诊断完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 诊断失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

diagnoseJeffData();


