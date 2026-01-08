import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { User } from '../modules/users/entities/user.entity';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember, TeamRole, MemberStatus } from '../modules/teams/entities/team-member.entity';
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

async function fixJeffData() {
  try {
    console.log('🔧 开始修复 jeff 账号数据问题...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const userRepository = dataSource.getRepository(User);
    const teamRepository = dataSource.getRepository(Team);
    const teamMemberRepository = dataSource.getRepository(TeamMember);
    const projectRepository = dataSource.getRepository(Project);

    // 1. 查找 jeff 账号
    console.log('1️⃣ 查找 jeff 账号...');
    const jeffUser = await userRepository.findOne({
      where: { email: 'jeff@bugong.com' },
    });

    if (!jeffUser) {
      console.log('   ❌ jeff 账号不存在！');
      process.exit(1);
    }
    console.log(`   ✅ 找到 jeff 账号: ${jeffUser.name} (${jeffUser.email})\n`);

    // 2. 查找"不恭文化"团队
    console.log('2️⃣ 查找"不恭文化"团队...');
    const bugongTeam = await teamRepository.findOne({
      where: { name: '不恭文化' },
    });

    if (!bugongTeam) {
      console.log('   ❌ "不恭文化"团队不存在！');
      process.exit(1);
    }
    console.log(`   ✅ 找到团队: ${bugongTeam.name} (${bugongTeam.code})\n`);

    // 3. 更新 jeff 的 team_id
    console.log('3️⃣ 更新 jeff 的 team_id...');
    if (jeffUser.team_id !== bugongTeam.id) {
      jeffUser.team_id = bugongTeam.id;
      await userRepository.save(jeffUser);
      console.log(`   ✅ 已更新 jeff 的 team_id 为: ${bugongTeam.id}\n`);
    } else {
      console.log(`   ⏭️  jeff 的 team_id 已经是正确的\n`);
    }

    // 4. 检查并添加团队成员关系
    console.log('4️⃣ 检查团队成员关系...');
    let jeffMember = await teamMemberRepository.findOne({
      where: { 
        team_id: bugongTeam.id,
        user_id: jeffUser.id,
      },
    });

    if (!jeffMember) {
      console.log('   ⚠️  jeff 不是团队成员，正在添加...');
      jeffMember = teamMemberRepository.create({
        team_id: bugongTeam.id,
        user_id: jeffUser.id,
        role: TeamRole.ADMIN,
        status: MemberStatus.ACTIVE,
        invited_by: bugongTeam.created_by,
      });
      await teamMemberRepository.save(jeffMember);
      console.log(`   ✅ 已添加 jeff 为团队成员 (角色: ${jeffMember.role})\n`);
    } else {
      console.log(`   ✅ jeff 已经是团队成员 (角色: ${jeffMember.role})\n`);
    }

    // 5. 查找所有没有 team_id 的项目
    console.log('5️⃣ 查找没有 team_id 的项目...');
    const projectsWithoutTeam = await projectRepository.find({
      where: { team_id: null as any },
    });

    console.log(`   📊 找到 ${projectsWithoutTeam.length} 个没有 team_id 的项目\n`);

    if (projectsWithoutTeam.length > 0) {
      console.log('6️⃣ 将项目关联到"不恭文化"团队...');
      let updatedCount = 0;
      
      for (const project of projectsWithoutTeam) {
        project.team_id = bugongTeam.id;
        await projectRepository.save(project);
        updatedCount++;
        console.log(`   ✅ 已更新: ${project.name}`);
      }

      console.log(`\n   📊 统计: 已更新 ${updatedCount} 个项目\n`);
    } else {
      console.log('6️⃣ 所有项目都已有关联团队，跳过更新\n');
    }

    // 7. 验证修复结果
    console.log('7️⃣ 验证修复结果...');
    const finalJeffUser = await userRepository.findOne({
      where: { email: 'jeff@bugong.com' },
    });
    const finalBugongProjects = await projectRepository.find({
      where: { team_id: bugongTeam.id },
    });
    const finalJeffMember = await teamMemberRepository.findOne({
      where: { 
        team_id: bugongTeam.id,
        user_id: jeffUser.id,
      },
    });

    console.log(`   ✅ jeff 的 team_id: ${finalJeffUser?.team_id || '❌ NULL'}`);
    console.log(`   ✅ jeff 是团队成员: ${finalJeffMember ? '是' : '❌ 否'}`);
    console.log(`   ✅ "不恭文化"团队的项目数: ${finalBugongProjects.length}\n`);

    if (finalBugongProjects.length > 0) {
      console.log('   📋 项目列表:');
      finalBugongProjects.forEach(p => {
        console.log(`      - ${p.name} (${p.status})`);
      });
      console.log('');
    }

    await dataSource.destroy();
    console.log('✅ 修复完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 使用 jeff@bugong.com 登录');
    console.log('   2. 应该能看到所有项目了');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 修复失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

fixJeffData();


