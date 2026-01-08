import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember, TeamRole, MemberStatus } from '../modules/teams/entities/team-member.entity';
import { User } from '../modules/users/entities/user.entity';
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

async function assignSeedDataToBugong() {
  try {
    console.log('🔄 开始将种子数据关联到"不恭文化"团队...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const teamRepository = dataSource.getRepository(Team);
    const teamMemberRepository = dataSource.getRepository(TeamMember);
    const userRepository = dataSource.getRepository(User);
    const projectRepository = dataSource.getRepository(Project);

    // 1. 查找或创建"不恭文化"团队
    console.log('1️⃣ 查找"不恭文化"团队...');
    let bugongTeam = await teamRepository.findOne({
      where: { name: '不恭文化' },
    });

    if (!bugongTeam) {
      console.log('   ⚠️  未找到"不恭文化"团队，正在创建...');
      
      // 查找一个管理员用户作为创建者
      const adminUser = await userRepository.findOne({
        where: { email: 'admin@vioflow.com' },
      });

      if (!adminUser) {
        console.log('   ❌ 未找到管理员用户，无法创建团队');
        process.exit(1);
      }

      // 生成团队代码（8位大写字母+数字）
      const teamCode = 'BUGONG' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      bugongTeam = teamRepository.create({
        name: '不恭文化',
        code: teamCode,
        description: '不恭文化团队',
        created_by: adminUser.id,
      });
      
      bugongTeam = await teamRepository.save(bugongTeam);
      console.log(`   ✅ 已创建团队: ${bugongTeam.name} (${bugongTeam.code})\n`);
    } else {
      console.log(`   ✅ 找到团队: ${bugongTeam.name} (${bugongTeam.code})\n`);
    }

    const teamId = bugongTeam.id;

    // 2. 将种子数据中的用户添加到"不恭文化"团队
    console.log('2️⃣ 将种子数据用户添加到团队...');
    const seedUserEmails = [
      'admin@vioflow.com',
      'sarah@vioflow.com',
      'mike@vioflow.com',
      'alex@vioflow.com',
      'sales@vioflow.com',
    ];

    const seedUsers = await userRepository.find({
      where: seedUserEmails.map(email => ({ email })),
    });

    console.log(`   📋 找到 ${seedUsers.length} 个种子数据用户`);

    let addedCount = 0;
    let existingCount = 0;

    for (const user of seedUsers) {
      // 检查是否已经是团队成员
      const existingMember = await teamMemberRepository.findOne({
        where: { team_id: teamId, user_id: user.id },
      });

      if (!existingMember) {
        // 创建团队成员记录
        const teamMember = teamMemberRepository.create({
          team_id: teamId,
          user_id: user.id,
          role: user.email === 'admin@vioflow.com' ? TeamRole.SUPER_ADMIN : TeamRole.MEMBER,
          status: MemberStatus.ACTIVE,
          invited_by: bugongTeam.created_by,
        });

        await teamMemberRepository.save(teamMember);
        console.log(`   ✅ 已添加: ${user.name} (${user.email})`);
        addedCount++;
      } else {
        console.log(`   ⏭️  已存在: ${user.name} (${user.email})`);
        existingCount++;
      }

      // 更新用户的team_id字段（如果为空）
      if (!user.team_id) {
        user.team_id = teamId;
        await userRepository.save(user);
      }
    }

    console.log(`   📊 统计: 新增 ${addedCount} 个成员，已存在 ${existingCount} 个成员\n`);

    // 3. 将种子数据中的项目关联到"不恭文化"团队
    console.log('3️⃣ 将种子数据项目关联到团队...');
    const seedProjectNames = [
      '2412_Nike_AirMax_Holiday',
      '2501_Spotify_Wrapped_Asia',
      '2411_Netflix_Docu_S1',
      '2410_Porsche_911_Launch',
      '2409_Apple_Event_Launch',
    ];

    const seedProjects = await projectRepository.find({
      where: seedProjectNames.map(name => ({ name })),
    });

    console.log(`   📋 找到 ${seedProjects.length} 个种子数据项目`);

    let updatedCount = 0;
    let alreadyAssignedCount = 0;

    for (const project of seedProjects) {
      if (project.team_id !== teamId) {
        project.team_id = teamId;
        await projectRepository.save(project);
        console.log(`   ✅ 已关联: ${project.name}`);
        updatedCount++;
      } else {
        console.log(`   ⏭️  已关联: ${project.name}`);
        alreadyAssignedCount++;
      }
    }

    console.log(`   📊 统计: 更新 ${updatedCount} 个项目，已关联 ${alreadyAssignedCount} 个项目\n`);

    // 4. 生成报告
    console.log('4️⃣ 生成关联报告...');
    const teamMembersCount = await teamMemberRepository.count({
      where: { team_id: teamId, status: MemberStatus.ACTIVE },
    });
    const teamProjectsCount = await projectRepository.count({
      where: { team_id: teamId },
    });

    const teamVideosCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM videos v
      JOIN projects p ON v.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);

    const teamDeliveriesCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM deliveries d
      JOIN projects p ON d.project_id = p.id
      WHERE p.team_id = $1
    `, [teamId]);

    console.log('\n📊 关联结果:');
    console.log(`   团队: ${bugongTeam.name} (${bugongTeam.code})`);
    console.log(`   团队成员数: ${teamMembersCount}`);
    console.log(`   项目数: ${teamProjectsCount}`);
    console.log(`   视频数: ${teamVideosCount[0]?.count || 0}`);
    console.log(`   交付数: ${teamDeliveriesCount[0]?.count || 0}`);
    console.log('');

    await dataSource.destroy();
    console.log('✅ 关联完成！');
    console.log('\n💡 下一步：');
    console.log('   1. 使用不恭文化团队的账号登录');
    console.log('   2. 应该能看到所有种子数据了');
    console.log('   3. 测试账号: admin@vioflow.com / admin');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 关联失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

assignSeedDataToBugong();


