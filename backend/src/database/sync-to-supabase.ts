import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// 加载环境变量
config({ path: path.join(__dirname, '../../.env') });

// 本地数据库配置
const localConfig = {
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vioflow_mam',
};

// Supabase 连接字符串
const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.argv[2];

if (!supabaseUrl || supabaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('❌ 错误: 请提供 Supabase 连接字符串');
  console.error('   方法1: 设置环境变量 SUPABASE_DATABASE_URL');
  console.error('   方法2: 作为命令行参数传入');
  console.error('   示例: npx ts-node sync-to-supabase.ts "postgresql://postgres.xxx:password@host:5432/postgres"');
  process.exit(1);
}

async function syncToSupabase() {
  let localDataSource: DataSource | null = null;
  let supabaseDataSource: DataSource | null = null;

  try {
    console.log('🔄 开始同步本地数据库到 Supabase...\n');

    // 解析 Supabase 连接字符串
    const urlObj = new URL(supabaseUrl);
    const supabaseConfig = {
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

    // 连接本地数据库
    console.log('📌 连接本地数据库...');
    localDataSource = new DataSource({
      ...localConfig,
      entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
    });
    await localDataSource.initialize();
    console.log(`   ✅ 本地数据库连接成功\n`);

    // 连接 Supabase
    console.log('📌 连接 Supabase 数据库...');
    supabaseDataSource = new DataSource({
      ...supabaseConfig,
      entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
    });
    await supabaseDataSource.initialize();
    console.log(`   ✅ Supabase 连接成功\n`);

    // 开始同步数据（按依赖顺序）
    console.log('📦 开始同步数据...\n');

    // 1. 同步 users 表
    console.log('1️⃣  同步 users 表...');
    const localUsers = await localDataSource.query('SELECT * FROM users ORDER BY created_at');
    console.log(`   本地有 ${localUsers.length} 个用户`);
    
    // 创建用户 ID 映射（本地 ID -> Supabase ID）
    const userIdMap = new Map<string, string>();
    
    if (localUsers.length > 0) {
      // 检查 Supabase 中是否已有数据
      const supabaseUserCount = await supabaseDataSource.query('SELECT COUNT(*) as count FROM users');
      const existingCount = parseInt(supabaseUserCount[0].count);
      
      if (existingCount > 0) {
        console.log(`   ⚠️  Supabase 中已有 ${existingCount} 个用户`);
        console.log('   检查用户 ID 和 email 匹配情况...');
        
        // 获取 Supabase 中已有的用户（按 email 匹配）
        const supabaseUsers = await supabaseDataSource.query('SELECT id, email FROM users');
        const emailToIdMap = new Map<string, string>(supabaseUsers.map((u: any) => [u.email as string, u.id as string]));
        
        // 检查哪些用户需要插入，哪些已存在
        const usersToInsert: any[] = [];
        const usersToUpdate: any[] = [];
        
        for (const localUser of localUsers) {
          const supabaseUserId = emailToIdMap.get(localUser.email as string);
          if (supabaseUserId) {
            // 用户已存在，记录 ID 映射
            userIdMap.set(localUser.id as string, supabaseUserId);
            console.log(`   ✓ ${localUser.email}: 已存在 (本地ID: ${(localUser.id as string).substring(0, 8)}... → SupabaseID: ${supabaseUserId.substring(0, 8)}...)`);
          } else {
            // 用户不存在，需要插入
            usersToInsert.push(localUser);
          }
        }
        
        console.log(`   将插入 ${usersToInsert.length} 个新用户`);
        
        if (usersToInsert.length > 0) {
          for (const user of usersToInsert) {
            await supabaseDataSource.query(
              `INSERT INTO users (id, email, name, avatar_url, role, password_hash, team_id, phone, is_active, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (id) DO UPDATE SET
                 email = EXCLUDED.email,
                 name = EXCLUDED.name,
                 avatar_url = EXCLUDED.avatar_url,
                 role = EXCLUDED.role,
                 password_hash = EXCLUDED.password_hash,
                 team_id = EXCLUDED.team_id,
                 phone = EXCLUDED.phone,
                 is_active = EXCLUDED.is_active,
                 updated_at = EXCLUDED.updated_at`,
              [
                user.id,
                user.email,
                user.name,
                user.avatar_url,
                user.role,
                user.password_hash,
                user.team_id,
                user.phone,
                user.is_active,
                user.created_at,
                user.updated_at,
              ]
            );
            // 新插入的用户，ID 相同
            userIdMap.set(user.id, user.id);
          }
          console.log(`   ✅ 成功插入 ${usersToInsert.length} 个新用户`);
        }
      } else {
        // Supabase 为空，直接插入所有用户
        for (const user of localUsers) {
          await supabaseDataSource.query(
            `INSERT INTO users (id, email, name, avatar_url, role, password_hash, team_id, phone, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               avatar_url = EXCLUDED.avatar_url,
               role = EXCLUDED.role,
               password_hash = EXCLUDED.password_hash,
               team_id = EXCLUDED.team_id,
               phone = EXCLUDED.phone,
               is_active = EXCLUDED.is_active,
               updated_at = EXCLUDED.updated_at`,
            [
              user.id,
              user.email,
              user.name,
              user.avatar_url,
              user.role,
              user.password_hash,
              user.team_id,
              user.phone,
              user.is_active,
              user.created_at,
              user.updated_at,
            ]
          );
          userIdMap.set(user.id, user.id);
        }
        console.log(`   ✅ 成功插入 ${localUsers.length} 个用户`);
      }
    }
    console.log('');

    // 2. 同步 teams 表
    console.log('2️⃣  同步 teams 表...');
    const localTeams = await localDataSource.query('SELECT * FROM teams ORDER BY created_at');
    console.log(`   本地有 ${localTeams.length} 个团队`);
    
    if (localTeams.length > 0) {
      const supabaseTeamCount = await supabaseDataSource.query('SELECT COUNT(*) as count FROM teams');
      const existingCount = parseInt(supabaseTeamCount[0].count);
      
      if (existingCount > 0) {
        const existingTeamIds = await supabaseDataSource.query('SELECT id FROM teams');
        const idSet = new Set(existingTeamIds.map((t: any) => t.id));
        const newTeams = localTeams.filter((t: any) => !idSet.has(t.id));
        console.log(`   将插入 ${newTeams.length} 个新团队`);
        
        if (newTeams.length > 0) {
          for (const team of newTeams) {
            // 使用用户 ID 映射来更新 created_by
            const supabaseUserId = userIdMap.get(team.created_by);
            if (!supabaseUserId) {
              console.log(`   ⚠️  警告: 团队 "${team.name}" 的创建者 (${team.created_by}) 在 Supabase 中不存在，跳过`);
              continue;
            }
            
            await supabaseDataSource.query(
              `INSERT INTO teams (id, name, code, description, created_by, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 code = EXCLUDED.code,
                 description = EXCLUDED.description,
                 created_by = EXCLUDED.created_by,
                 updated_at = EXCLUDED.updated_at`,
              [
                team.id,
                team.name,
                team.code,
                team.description,
                supabaseUserId, // 使用映射后的用户 ID
                team.created_at,
                team.updated_at,
              ]
            );
          }
          console.log(`   ✅ 成功插入 ${newTeams.length} 个新团队`);
        }
      } else {
        for (const team of localTeams) {
          // 使用用户 ID 映射来更新 created_by
          const supabaseUserId = userIdMap.get(team.created_by);
          if (!supabaseUserId) {
            console.log(`   ⚠️  警告: 团队 "${team.name}" 的创建者 (${team.created_by}) 在 Supabase 中不存在，跳过`);
            continue;
          }
          
          await supabaseDataSource.query(
            `INSERT INTO teams (id, name, code, description, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               code = EXCLUDED.code,
               description = EXCLUDED.description,
               created_by = EXCLUDED.created_by,
               updated_at = EXCLUDED.updated_at`,
            [
              team.id,
              team.name,
              team.code,
              team.description,
              supabaseUserId, // 使用映射后的用户 ID
              team.created_at,
              team.updated_at,
            ]
          );
        }
        console.log(`   ✅ 成功插入 ${localTeams.length} 个团队`);
      }
    }
    console.log('');

    // 3. 同步 team_members 表
    console.log('3️⃣  同步 team_members 表...');
    const localTeamMembers = await localDataSource.query('SELECT * FROM team_members ORDER BY created_at');
    console.log(`   本地有 ${localTeamMembers.length} 个团队成员关系`);
    
    if (localTeamMembers.length > 0) {
      const supabaseCount = await supabaseDataSource.query('SELECT COUNT(*) as count FROM team_members');
      const existingCount = parseInt(supabaseCount[0].count);
      
      if (existingCount > 0) {
        const existing = await supabaseDataSource.query('SELECT team_id, user_id FROM team_members');
        const keySet = new Set(existing.map((tm: any) => `${tm.team_id}-${tm.user_id}`));
        const newMembers = localTeamMembers.filter((tm: any) => !keySet.has(`${tm.team_id}-${tm.user_id}`));
        console.log(`   将插入 ${newMembers.length} 个新成员关系`);
        
        if (newMembers.length > 0) {
          for (const member of newMembers) {
            // 使用用户 ID 映射
            const supabaseUserId = userIdMap.get(member.user_id);
            if (!supabaseUserId) {
              console.log(`   ⚠️  警告: 成员关系中的用户 (${member.user_id}) 在 Supabase 中不存在，跳过`);
              continue;
            }
            
            await supabaseDataSource.query(
              `INSERT INTO team_members (id, team_id, user_id, role, status, invited_by, joined_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (team_id, user_id) DO UPDATE SET
                 role = EXCLUDED.role,
                 status = EXCLUDED.status,
                 invited_by = EXCLUDED.invited_by,
                 joined_at = EXCLUDED.joined_at,
                 updated_at = EXCLUDED.updated_at`,
              [
                member.id,
                member.team_id,
                supabaseUserId, // 使用映射后的用户 ID
                member.role,
                member.status,
                member.invited_by ? userIdMap.get(member.invited_by) || member.invited_by : null,
                member.joined_at,
                member.created_at,
                member.updated_at,
              ]
            );
          }
          console.log(`   ✅ 成功插入 ${newMembers.length} 个成员关系`);
        }
      } else {
        for (const member of localTeamMembers) {
          // 使用用户 ID 映射
          const supabaseUserId = userIdMap.get(member.user_id);
          if (!supabaseUserId) {
            console.log(`   ⚠️  警告: 成员关系中的用户 (${member.user_id}) 在 Supabase 中不存在，跳过`);
            continue;
          }
          
          await supabaseDataSource.query(
            `INSERT INTO team_members (id, team_id, user_id, role, status, invited_by, joined_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (team_id, user_id) DO UPDATE SET
               role = EXCLUDED.role,
               status = EXCLUDED.status,
               invited_by = EXCLUDED.invited_by,
               joined_at = EXCLUDED.joined_at,
               updated_at = EXCLUDED.updated_at`,
            [
              member.id,
              member.team_id,
              supabaseUserId, // 使用映射后的用户 ID
              member.role,
              member.status,
              member.invited_by ? userIdMap.get(member.invited_by) || member.invited_by : null,
              member.joined_at,
              member.created_at,
              member.updated_at,
            ]
          );
        }
        console.log(`   ✅ 成功插入 ${localTeamMembers.length} 个成员关系`);
      }
    }
    console.log('');

    // 4. 同步其他表（按依赖顺序）
    const tablesToSync = [
      { name: 'project_groups', order: 4 },
      { name: 'projects', order: 5 },
      { name: 'project_members', order: 6 },
      { name: 'videos', order: 7 },
      { name: 'tags', order: 8 },
      { name: 'video_tags', order: 9 },
      { name: 'annotations', order: 10 },
      { name: 'share_links', order: 11 },
      { name: 'share_link_access_logs', order: 12 },
      { name: 'deliveries', order: 13 },
      { name: 'delivery_folders', order: 14 },
      { name: 'delivery_files', order: 15 },
      { name: 'delivery_packages', order: 16 },
      { name: 'delivery_package_files', order: 17 },
      { name: 'showcase_packages', order: 18 },
      { name: 'showcase_package_videos', order: 19 },
      { name: 'notifications', order: 20 },
      { name: 'upload_tasks', order: 21 },
      { name: 'archiving_tasks', order: 22 },
      { name: 'view_tracking', order: 23 },
      { name: 'audit_logs', order: 24 },
      { name: 'storage_usage', order: 25 },
    ];

    for (const table of tablesToSync) {
      try {
        // 检查表是否存在
        const tableExists = await supabaseDataSource.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table.name]
        );

        if (!tableExists[0].exists) {
          console.log(`${table.order}️⃣  跳过 ${table.name} 表（在 Supabase 中不存在）`);
          continue;
        }

        const localData = await localDataSource.query(`SELECT * FROM ${table.name} ORDER BY created_at LIMIT 10000`);
        console.log(`${table.order}️⃣  同步 ${table.name} 表...`);
        console.log(`   本地有 ${localData.length} 条记录`);

        if (localData.length > 0) {
          // 获取表的所有列
          const columns = await localDataSource.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = $1 AND table_schema = 'public' 
             ORDER BY ordinal_position`,
            [table.name]
          );
          const columnNames = columns.map((c: any) => c.column_name);

          // 检查 Supabase 中是否已有数据
          const supabaseCount = await supabaseDataSource.query(`SELECT COUNT(*) as count FROM ${table.name}`);
          const existingCount = parseInt(supabaseCount[0].count);

          if (existingCount > 0) {
            // 获取主键或唯一键
            const primaryKey = await localDataSource.query(
              `SELECT a.attname
               FROM pg_index i
               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
               WHERE i.indrelid = $1::regclass AND i.indisprimary
               LIMIT 1`,
              [`${table.name}`]
            );

            if (primaryKey.length > 0) {
              const pkName = primaryKey[0].attname;
              const existingIds = await supabaseDataSource.query(`SELECT ${pkName} FROM ${table.name}`);
              const idSet = new Set(existingIds.map((r: any) => r[pkName]));
              const newData = localData.filter((r: any) => !idSet.has(r[pkName]));
              console.log(`   将插入 ${newData.length} 条新记录`);

              if (newData.length > 0) {
                for (const row of newData) {
                  const values = columnNames.map((col: string) => row[col]);
                  const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
                  const insertQuery = `INSERT INTO ${table.name} (${columnNames.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                  await supabaseDataSource.query(insertQuery, values);
                }
                console.log(`   ✅ 成功插入 ${newData.length} 条记录`);
              }
            } else {
              console.log(`   ⚠️  无法确定主键，跳过同步`);
            }
          } else {
            // Supabase 为空，批量插入
            for (const row of localData) {
              const values = columnNames.map((col: string) => row[col]);
              const placeholders = columnNames.map((_, i) => `$${i + 1}`).join(', ');
              const insertQuery = `INSERT INTO ${table.name} (${columnNames.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
              await supabaseDataSource.query(insertQuery, values);
            }
            console.log(`   ✅ 成功插入 ${localData.length} 条记录`);
          }
        }
        console.log('');
      } catch (error: any) {
        console.log(`   ⚠️  同步 ${table.name} 表时出错: ${error.message}`);
        console.log('');
      }
    }

    // 验证同步结果
    console.log('📊 验证同步结果...\n');
    const localUserCount = await localDataSource.query('SELECT COUNT(*) as count FROM users');
    const supabaseUserCount = await supabaseDataSource.query('SELECT COUNT(*) as count FROM users');
    const localTeamCount = await localDataSource.query('SELECT COUNT(*) as count FROM teams');
    const supabaseTeamCount = await supabaseDataSource.query('SELECT COUNT(*) as count FROM teams');

    console.log(`   用户: 本地 ${localUserCount[0].count} 个 → Supabase ${supabaseUserCount[0].count} 个`);
    console.log(`   团队: 本地 ${localTeamCount[0].count} 个 → Supabase ${supabaseTeamCount[0].count} 个`);

    console.log('\n✅ 数据同步完成！');
    console.log('\n📝 下一步:');
    console.log('   1. 在 backend/.env 文件中设置 DATABASE_URL 指向 Supabase');
    console.log('   2. 重启应用验证连接');
    console.log('   3. 确认数据正确后，可以删除本地数据库');

  } catch (error: any) {
    console.error('\n❌ 同步失败:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    console.error('\n💡 提示: 请确保 Supabase 连接字符串正确，并且有写入权限');
    process.exit(1);
  } finally {
    if (localDataSource?.isInitialized) {
      await localDataSource.destroy();
    }
    if (supabaseDataSource?.isInitialized) {
      await supabaseDataSource.destroy();
    }
  }
}

syncToSupabase();

