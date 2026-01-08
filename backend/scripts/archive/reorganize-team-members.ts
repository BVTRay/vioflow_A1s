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

async function reorganizeTeamMembers() {
  try {
    console.log('🔄 开始重新组织团队成员...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const teamRepository = dataSource.getRepository(Team);
    const teamMemberRepository = dataSource.getRepository(TeamMember);
    const userRepository = dataSource.getRepository(User);
    const projectRepository = dataSource.getRepository(Project);

    // 1. 查找"不恭文化"团队
    console.log('1️⃣ 查找"不恭文化"团队...');
    let bugongTeam = await teamRepository.findOne({
      where: { name: '不恭文化' },
    });

    if (!bugongTeam) {
      console.log('   ❌ 未找到"不恭文化"团队');
      process.exit(1);
    }

    console.log(`   ✅ 找到团队: ${bugongTeam.name} (${bugongTeam.code})\n`);
    const bugongTeamId = bugongTeam.id;

    // 2. 查找 ray、jeff、bevis 用户
    console.log('2️⃣ 查找 ray、jeff、bevis 用户...');
    const bugongUserEmails = ['ray', 'jeff', 'bevis'].map(name => 
      name.includes('@') ? name : `${name}@vioflow.com`
    );

    // 尝试多种可能的邮箱格式
    const possibleEmails = [
      ...bugongUserEmails,
      'ray@bugong.com',
      'jeff@bugong.com',
      'bevis@bugong.com',
    ];

    const bugongUsers: User[] = [];
    for (const emailPattern of possibleEmails) {
      const users = await userRepository.find({
        where: [
          { email: emailPattern },
          { email: { $like: `%${emailPattern.split('@')[0]}%` } as any },
        ],
      });
      bugongUsers.push(...users);
    }

    // 去重
    const uniqueBugongUsers = Array.from(
      new Map(bugongUsers.map(u => [u.id, u])).values()
    );

    // 如果没找到，尝试通过用户名查找
    if (uniqueBugongUsers.length === 0) {
      for (const name of ['ray', 'jeff', 'bevis']) {
        const users = await userRepository.find({
          where: { name: { $ilike: `%${name}%` } as any },
        });
        bugongUsers.push(...users);
      }
    }

    // 再次去重
    const finalBugongUsers = Array.from(
      new Map(bugongUsers.map(u => [u.id, u])).values()
    );

    if (finalBugongUsers.length === 0) {
      console.log('   ⚠️  未找到 ray、jeff、bevis 用户，尝试查询所有用户...');
      const allUsers = await userRepository.find({ take: 20 });
      console.log('   📋 前20个用户:');
      allUsers.forEach(u => {
        console.log(`      - ${u.name} (${u.email})`);
      });
      console.log('');
    } else {
      console.log(`   ✅ 找到 ${finalBugongUsers.length} 个用户:`);
      finalBugongUsers.forEach(u => {
        console.log(`      - ${u.name} (${u.email})`);
      });
      console.log('');
    }

    // 3. 将 ray、jeff、bevis 添加到"不恭文化"团队
    console.log('3️⃣ 将 ray、jeff、bevis 添加到"不恭文化"团队...');
    let addedCount = 0;
    let existingCount = 0;

    for (const user of finalBugongUsers) {
      const existingMember = await teamMemberRepository.findOne({
        where: { team_id: bugongTeamId, user_id: user.id },
      });

      if (!existingMember) {
        const teamMember = teamMemberRepository.create({
          team_id: bugongTeamId,
          user_id: user.id,
          role: TeamRole.MEMBER,
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

      // 更新用户的team_id字段
      if (user.team_id !== bugongTeamId) {
        user.team_id = bugongTeamId;
        await userRepository.save(user);
      }
    }

    console.log(`   📊 统计: 新增 ${addedCount} 个成员，已存在 ${existingCount} 个成员\n`);

    // 4. 查找种子数据用户（admin、sarah、mike、alex、sales）
    console.log('4️⃣ 处理种子数据用户（从"不恭文化"团队移除）...');
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

    // 5. 创建"示例团队"用于种子数据用户
    console.log('5️⃣ 创建"示例团队"用于种子数据用户...');
    let exampleTeam = await teamRepository.findOne({
      where: { name: '示例团队' },
    });

    if (!exampleTeam) {
      // 查找一个种子数据用户作为创建者
      const adminUser = seedUsers.find(u => u.email === 'admin@vioflow.com') || seedUsers[0];
      
      if (!adminUser) {
        console.log('   ⚠️  未找到种子数据用户，跳过创建示例团队');
      } else {
        // 生成8位团队代码（确保不超过12个字符）
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const teamCode = 'EX' + randomPart;
        
        exampleTeam = teamRepository.create({
          name: '示例团队',
          code: teamCode,
          description: '示例数据团队',
          created_by: adminUser.id,
        });
        
        exampleTeam = await teamRepository.save(exampleTeam);
        console.log(`   ✅ 已创建团队: ${exampleTeam.name} (${exampleTeam.code})\n`);
      }
    } else {
      console.log(`   ✅ 找到团队: ${exampleTeam.name} (${exampleTeam.code})\n`);
    }

    // 6. 将种子数据用户从"不恭文化"团队移除，添加到"示例团队"
    if (exampleTeam && seedUsers.length > 0) {
      console.log('6️⃣ 将种子数据用户转移到"示例团队"...');
      const exampleTeamId = exampleTeam.id;
      let movedCount = 0;
      let addedToExampleCount = 0;

      for (const user of seedUsers) {
        // 从"不恭文化"团队移除
        const bugongMember = await teamMemberRepository.findOne({
          where: { team_id: bugongTeamId, user_id: user.id },
        });

        if (bugongMember) {
          await teamMemberRepository.remove(bugongMember);
          console.log(`   ✅ 已从"不恭文化"移除: ${user.name} (${user.email})`);
          movedCount++;
        }

        // 添加到"示例团队"
        const existingExampleMember = await teamMemberRepository.findOne({
          where: { team_id: exampleTeamId, user_id: user.id },
        });

        if (!existingExampleMember) {
          const teamMember = teamMemberRepository.create({
            team_id: exampleTeamId,
            user_id: user.id,
            role: user.email === 'admin@vioflow.com' ? TeamRole.SUPER_ADMIN : TeamRole.MEMBER,
            status: MemberStatus.ACTIVE,
            invited_by: exampleTeam.created_by,
          });

          await teamMemberRepository.save(teamMember);
          console.log(`   ✅ 已添加到"示例团队": ${user.name} (${user.email})`);
          addedToExampleCount++;
        }

        // 更新用户的team_id字段
        user.team_id = exampleTeamId;
        await userRepository.save(user);
      }

      console.log(`   📊 统计: 移除 ${movedCount} 个成员，添加到示例团队 ${addedToExampleCount} 个成员\n`);

      // 7. 将种子数据项目也转移到"示例团队"
      console.log('7️⃣ 将种子数据项目转移到"示例团队"...');
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

      let projectMovedCount = 0;
      for (const project of seedProjects) {
        if (project.team_id === bugongTeamId) {
          project.team_id = exampleTeamId;
          await projectRepository.save(project);
          console.log(`   ✅ 已转移项目: ${project.name}`);
          projectMovedCount++;
        }
      }

      console.log(`   📊 统计: 转移 ${projectMovedCount} 个项目\n`);
    }

    // 8. 生成最终报告
    console.log('8️⃣ 生成最终报告...');
    const bugongMembersCount = await teamMemberRepository.count({
      where: { team_id: bugongTeamId, status: MemberStatus.ACTIVE },
    });
    const bugongProjectsCount = await projectRepository.count({
      where: { team_id: bugongTeamId },
    });

    console.log('\n📊 最终结果:');
    console.log(`\n   🏢 "不恭文化"团队:`);
    console.log(`      成员数: ${bugongMembersCount}`);
    console.log(`      项目数: ${bugongProjectsCount}`);

    if (exampleTeam) {
      const exampleMembersCount = await teamMemberRepository.count({
        where: { team_id: exampleTeam.id, status: MemberStatus.ACTIVE },
      });
      const exampleProjectsCount = await projectRepository.count({
        where: { team_id: exampleTeam.id },
      });

      console.log(`\n   🏢 "示例团队":`);
      console.log(`      成员数: ${exampleMembersCount}`);
      console.log(`      项目数: ${exampleProjectsCount}`);
    }

    console.log('');

    await dataSource.destroy();
    console.log('✅ 重新组织完成！');
    console.log('\n💡 说明：');
    console.log('   - ray、jeff、bevis 现在属于"不恭文化"团队');
    console.log('   - 种子数据用户现在属于"示例团队"');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 重新组织失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

reorganizeTeamMembers();

