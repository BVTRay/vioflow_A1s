import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Team } from '../modules/teams/entities/team.entity';
import { TeamMember } from '../modules/teams/entities/team-member.entity';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { ProjectGroup } from '../modules/project-groups/entities/project-group.entity';
import { StorageUsage } from '../modules/storage/entities/storage-usage.entity';

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

async function consolidateToBugongTeam() {
  try {
    console.log('🔄 开始整合所有数据到"不恭文化"团队...\n');
    
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 1. 查找"不恭文化"团队
    console.log('1️⃣ 查找"不恭文化"团队...');
    const bugongTeam = await dataSource.query(`
      SELECT id, name, code, created_by FROM teams WHERE name = '不恭文化' LIMIT 1
    `);

    if (bugongTeam.length === 0) {
      console.log('   ❌ 未找到"不恭文化"团队');
      process.exit(1);
    }

    const bugongTeamId = bugongTeam[0].id;
    const bugongTeamCreatorId = bugongTeam[0].created_by;
    console.log(`   ✅ 找到团队: ${bugongTeam[0].name} (${bugongTeam[0].code})`);
    console.log(`   ID: ${bugongTeamId}`);
    console.log(`   创建者ID: ${bugongTeamCreatorId}\n`);

    // 2. 查找所有其他团队
    console.log('2️⃣ 查找所有其他团队...');
    const otherTeams = await dataSource.query(`
      SELECT id, name, code FROM teams WHERE id != $1
    `, [bugongTeamId]);

    console.log(`   📋 找到 ${otherTeams.length} 个其他团队:`);
    otherTeams.forEach((team: any) => {
      console.log(`      - ${team.name} (${team.code}) - ID: ${team.id}`);
    });
    console.log('');

    // 3. 更新所有项目的team_id为不恭文化团队
    console.log('3️⃣ 更新所有项目的team_id...');
    const projectsResult = await dataSource.query(`
      UPDATE projects
      SET team_id = $1
      WHERE team_id IS NOT NULL AND team_id != $1
      RETURNING id, name
    `, [bugongTeamId]);
    console.log(`   ✅ 更新了 ${projectsResult.length} 个项目\n`);

    // 4. 更新所有用户的team_id为不恭文化团队
    console.log('4️⃣ 更新所有用户的team_id...');
    const usersResult = await dataSource.query(`
      UPDATE users
      SET team_id = $1
      WHERE team_id IS NOT NULL AND team_id != $1
      RETURNING id, name, email
    `, [bugongTeamId]);
    console.log(`   ✅ 更新了 ${usersResult.length} 个用户的team_id\n`);

    // 5. 处理team_members表：将其他团队的成员转移到不恭文化团队
    console.log('5️⃣ 处理团队成员关系...');
    
    // 先查找所有其他团队的成员
    const otherTeamIds = otherTeams.map((t: any) => t.id);
    if (otherTeamIds.length > 0) {
      const otherMembers = await dataSource.query(`
        SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.status, u.email
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ANY($1)
      `, [otherTeamIds]);

      console.log(`   📋 找到 ${otherMembers.length} 个其他团队的成员`);

      let addedCount = 0;
      let skippedCount = 0;

      for (const member of otherMembers) {
        // 检查是否已经是不恭文化团队的成员
        const existingMember = await dataSource.query(`
          SELECT id FROM team_members
          WHERE team_id = $1 AND user_id = $2
        `, [bugongTeamId, member.user_id]);

        if (existingMember.length === 0) {
          // 添加到不恭文化团队
          await dataSource.query(`
            INSERT INTO team_members (team_id, user_id, role, status, invited_by, joined_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, now(), now(), now())
            ON CONFLICT (team_id, user_id) DO NOTHING
          `, [
            bugongTeamId,
            member.user_id,
            member.role,
            member.status,
            bugongTeamCreatorId || null,
          ]);
          console.log(`   ✅ 已添加: ${member.email} (${member.role})`);
          addedCount++;
        } else {
          console.log(`   ⏭️  已存在: ${member.email}`);
          skippedCount++;
        }
      }

      console.log(`   📊 统计: 新增 ${addedCount} 个成员，已存在 ${skippedCount} 个成员\n`);

      // 删除其他团队的成员关系
      const deletedMembers = await dataSource.query(`
        DELETE FROM team_members
        WHERE team_id = ANY($1)
        RETURNING id
      `, [otherTeamIds]);
      console.log(`   ✅ 删除了 ${deletedMembers.length} 条其他团队的成员关系\n`);
    } else {
      console.log('   ⏭️  没有其他团队，跳过成员转移\n');
    }

    // 6. 处理项目组：先清空项目的group_id，然后删除其他团队的项目组
    console.log('6️⃣ 处理项目组...');
    const otherProjectGroups = await dataSource.query(`
      SELECT pg.id, pg.name, pg.team_id
      FROM project_groups pg
      WHERE pg.team_id != $1
    `, [bugongTeamId]);

    if (otherProjectGroups.length > 0) {
      console.log(`   📋 找到 ${otherProjectGroups.length} 个其他团队的项目组`);
      
      // 先清空引用这些项目组的项目的group_id
      const otherGroupIds = otherProjectGroups.map((pg: any) => pg.id);
      const updatedProjects = await dataSource.query(`
        UPDATE projects
        SET group_id = NULL
        WHERE group_id = ANY($1)
        RETURNING id, name
      `, [otherGroupIds]);
      console.log(`   ✅ 清空了 ${updatedProjects.length} 个项目的group_id引用`);

      // 删除其他团队的项目组
      const deletedGroups = await dataSource.query(`
        DELETE FROM project_groups
        WHERE id = ANY($1)
        RETURNING id, name
      `, [otherGroupIds]);
      
      console.log(`   ✅ 删除了 ${deletedGroups.length} 个其他团队的项目组\n`);
    } else {
      console.log('   ⏭️  没有其他团队的项目组\n');
    }

    // 7. 更新存储使用统计的team_id（合并数据）
    console.log('7️⃣ 处理存储使用统计...');
    const otherStorage = await dataSource.query(`
      SELECT 
        SUM(total_size) as total_size,
        SUM(standard_size) as standard_size,
        SUM(cold_size) as cold_size,
        SUM(file_count) as file_count
      FROM storage_usage
      WHERE team_id != $1
    `, [bugongTeamId]);

    const bugongStorage = await dataSource.query(`
      SELECT id, total_size, standard_size, cold_size, file_count
      FROM storage_usage
      WHERE team_id = $1
      LIMIT 1
    `, [bugongTeamId]);

    if (otherStorage[0] && (otherStorage[0].total_size || otherStorage[0].file_count)) {
      if (bugongStorage.length > 0) {
        // 合并数据
        const current = bugongStorage[0];
        const other = otherStorage[0];
        const newTotalSize = (parseInt(current.total_size || 0) + parseInt(other.total_size || 0));
        const newStandardSize = (parseInt(current.standard_size || 0) + parseInt(other.standard_size || 0));
        const newColdSize = (parseInt(current.cold_size || 0) + parseInt(other.cold_size || 0));
        const newFileCount = (parseInt(current.file_count || 0) + parseInt(other.file_count || 0));

        await dataSource.query(`
          UPDATE storage_usage
          SET 
            total_size = $1,
            standard_size = $2,
            cold_size = $3,
            file_count = $4,
            updated_at = now()
          WHERE team_id = $5
        `, [newTotalSize, newStandardSize, newColdSize, newFileCount, bugongTeamId]);
        console.log(`   ✅ 已合并存储统计数据\n`);
      } else {
        // 创建新的存储统计
        const other = otherStorage[0];
        await dataSource.query(`
          INSERT INTO storage_usage (team_id, total_size, standard_size, cold_size, file_count, updated_at)
          VALUES ($1, $2, $3, $4, $5, now())
        `, [
          bugongTeamId,
          parseInt(other.total_size || 0),
          parseInt(other.standard_size || 0),
          parseInt(other.cold_size || 0),
          parseInt(other.file_count || 0),
        ]);
        console.log(`   ✅ 已创建存储统计\n`);
      }

      // 删除其他团队的存储统计
      const deletedStorage = await dataSource.query(`
        DELETE FROM storage_usage
        WHERE team_id != $1
        RETURNING id
      `, [bugongTeamId]);
      console.log(`   ✅ 删除了 ${deletedStorage.length} 条其他团队的存储统计\n`);
    } else {
      console.log('   ⏭️  没有其他团队的存储统计，跳过\n');
    }

    // 8. 更新审计日志的team_id
    console.log('8️⃣ 更新审计日志的team_id...');
    const auditLogsResult = await dataSource.query(`
      UPDATE audit_logs
      SET team_id = $1
      WHERE team_id IS NOT NULL AND team_id != $1
      RETURNING id
    `, [bugongTeamId]);
    console.log(`   ✅ 更新了 ${auditLogsResult.length} 条审计日志\n`);

    // 9. 删除其他团队（需要先删除外键约束相关的数据）
    console.log('9️⃣ 删除其他团队...');
    if (otherTeamIds.length > 0) {
      // 删除其他团队（CASCADE会自动删除关联的team_members等）
      const deletedTeams = await dataSource.query(`
        DELETE FROM teams
        WHERE id = ANY($1)
        RETURNING id, name, code
      `, [otherTeamIds]);

      console.log(`   ✅ 删除了 ${deletedTeams.length} 个团队:`);
      deletedTeams.forEach((team: any) => {
        console.log(`      - ${team.name} (${team.code})`);
      });
      console.log('');
    } else {
      console.log('   ⏭️  没有其他团队需要删除\n');
    }

    // 10. 生成最终报告
    console.log('📊 生成最终报告...');
    const finalTeams = await dataSource.query(`
      SELECT id, name, code FROM teams
    `);

    const finalTeamMembers = await dataSource.query(`
      SELECT COUNT(*) as count FROM team_members WHERE team_id = $1
    `, [bugongTeamId]);

    const finalProjects = await dataSource.query(`
      SELECT COUNT(*) as count FROM projects WHERE team_id = $1
    `, [bugongTeamId]);

    const finalVideos = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM videos v
      JOIN projects p ON v.project_id = p.id
      WHERE p.team_id = $1
    `, [bugongTeamId]);

    const finalUsers = await dataSource.query(`
      SELECT COUNT(*) as count FROM users WHERE team_id = $1
    `, [bugongTeamId]);

    console.log('\n📊 最终结果:');
    console.log(`\n   🏢 团队数量: ${finalTeams.length}`);
    finalTeams.forEach((team: any) => {
      console.log(`      - ${team.name} (${team.code})`);
    });

    console.log(`\n   👥 团队成员数: ${finalTeamMembers[0]?.count || 0}`);
    console.log(`   📁 项目数: ${finalProjects[0]?.count || 0}`);
    console.log(`   🎬 视频数: ${finalVideos[0]?.count || 0}`);
    console.log(`   👤 关联用户数: ${finalUsers[0]?.count || 0}`);
    console.log('');

    await dataSource.destroy();
    console.log('✅ 整合完成！');
    console.log('\n💡 说明：');
    console.log('   - 所有数据现在都属于"不恭文化"团队');
    console.log('   - 其他团队已全部删除');
    console.log('   - 所有用户、项目、视频都已关联到"不恭文化"团队');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 整合失败:', error.message);
    console.error('\n完整错误:', error);
    process.exit(1);
  }
}

consolidateToBugongTeam();

