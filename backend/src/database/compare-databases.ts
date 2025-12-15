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

// Supabase 连接字符串（需要用户提供完整连接字符串）
const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.argv[2];

if (!supabaseUrl || supabaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('❌ 错误: 请提供 Supabase 连接字符串');
  console.error('   方法1: 设置环境变量 SUPABASE_DATABASE_URL');
  console.error('   方法2: 作为命令行参数传入');
  console.error('   示例: npx ts-node compare-databases.ts "postgresql://postgres.xxx:password@host:5432/postgres"');
  process.exit(1);
}

async function compareDatabases() {
  let localDataSource: DataSource | null = null;
  let supabaseDataSource: DataSource | null = null;

  try {
    console.log('🔍 开始对比本地数据库和 Supabase 数据库...\n');

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
    console.log(`   ✅ 本地数据库连接成功 (${localConfig.host}:${localConfig.port}/${localConfig.database})\n`);

    // 连接 Supabase
    console.log('📌 连接 Supabase 数据库...');
    const maskedUrl = supabaseUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`   连接字符串: ${maskedUrl}`);
    supabaseDataSource = new DataSource({
      ...supabaseConfig,
      entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
    });
    await supabaseDataSource.initialize();
    console.log(`   ✅ Supabase 连接成功 (${supabaseConfig.host}:${supabaseConfig.port}/${supabaseConfig.database})\n`);

    // 对比 teams 表
    console.log('📊 对比 teams 表...');
    const localTeams = await localDataSource.query('SELECT id, name, code FROM teams ORDER BY name');
    const supabaseTeams = await supabaseDataSource.query('SELECT id, name, code FROM teams ORDER BY name');

    console.log(`   本地团队数: ${localTeams.length}`);
    console.log(`   Supabase 团队数: ${supabaseTeams.length}\n`);

    // 找出差异
    const localTeamNames = new Set(localTeams.map((t: any) => t.name));
    const supabaseTeamNames = new Set(supabaseTeams.map((t: any) => t.name));

    const onlyInLocal = localTeams.filter((t: any) => !supabaseTeamNames.has(t.name));
    const onlyInSupabase = supabaseTeams.filter((t: any) => !localTeamNames.has(t.name));

    if (onlyInLocal.length > 0) {
      console.log('   ⚠️  只在本地数据库中的团队:');
      onlyInLocal.forEach((team: any) => {
        console.log(`      - ${team.name} (代码: ${team.code}, ID: ${team.id})`);
      });
      console.log('');
    }

    if (onlyInSupabase.length > 0) {
      console.log('   ⚠️  只在 Supabase 中的团队:');
      onlyInSupabase.forEach((team: any) => {
        console.log(`      - ${team.name} (代码: ${team.code}, ID: ${team.id})`);
      });
      console.log('');
    }

    // 检查"不恭文化"团队
    console.log('🔍 检查"不恭文化"团队...');
    const localBugong = localTeams.filter((t: any) => t.name.includes('不恭') || t.name.includes('文化'));
    const supabaseBugong = supabaseTeams.filter((t: any) => t.name.includes('不恭') || t.name.includes('文化'));

    if (localBugong.length > 0) {
      console.log('   ✅ 在本地数据库中找到:');
      localBugong.forEach((team: any) => {
        console.log(`      - ${team.name} (代码: ${team.code}, ID: ${team.id})`);
      });
    } else {
      console.log('   ❌ 本地数据库中未找到');
    }

    if (supabaseBugong.length > 0) {
      console.log('   ✅ 在 Supabase 中找到:');
      supabaseBugong.forEach((team: any) => {
        console.log(`      - ${team.name} (代码: ${team.code}, ID: ${team.id})`);
      });
    } else {
      console.log('   ❌ Supabase 中未找到');
    }
    console.log('');

    // 对比 users 表
    console.log('📊 对比 users 表...');
    const localUsers = await localDataSource.query('SELECT id, email, name, role FROM users ORDER BY email');
    const supabaseUsers = await supabaseDataSource.query('SELECT id, email, name, role FROM users ORDER BY email');

    console.log(`   本地用户数: ${localUsers.length}`);
    console.log(`   Supabase 用户数: ${supabaseUsers.length}\n`);

    const localUserEmails = new Set(localUsers.map((u: any) => u.email));
    const supabaseUserEmails = new Set(supabaseUsers.map((u: any) => u.email));

    const onlyInLocalUsers = localUsers.filter((u: any) => !supabaseUserEmails.has(u.email));
    const onlyInSupabaseUsers = supabaseUsers.filter((u: any) => !localUserEmails.has(u.email));

    if (onlyInLocalUsers.length > 0) {
      console.log('   ⚠️  只在本地数据库中的用户:');
      onlyInLocalUsers.forEach((user: any) => {
        console.log(`      - ${user.name} (${user.email})`);
      });
      console.log('');
    }

    if (onlyInSupabaseUsers.length > 0) {
      console.log('   ⚠️  只在 Supabase 中的用户:');
      onlyInSupabaseUsers.forEach((user: any) => {
        console.log(`      - ${user.name} (${user.email})`);
      });
      console.log('');
    }

    // 检查应用实际使用的数据库
    console.log('🔍 检查应用配置...');
    const appDatabaseUrl = process.env.DATABASE_URL;
    if (appDatabaseUrl) {
      const maskedAppUrl = appDatabaseUrl.replace(/:[^:@]+@/, ':****@');
      console.log(`   DATABASE_URL: ${maskedAppUrl}`);
      
      if (appDatabaseUrl.includes('supabase') || appDatabaseUrl.includes('pooler.supabase.com')) {
        console.log('   ✅ 应用配置为使用 Supabase');
        if (onlyInLocal.length > 0) {
          console.log('   ⚠️  警告: 应用连接 Supabase，但"不恭文化"团队只在本地数据库中！');
        }
      } else if (appDatabaseUrl.includes('localhost')) {
        console.log('   ✅ 应用配置为使用本地数据库');
        if (onlyInSupabase.length > 0) {
          console.log('   ⚠️  警告: 应用连接本地数据库，但 Supabase 中有不同的数据！');
        }
      }
    } else {
      console.log('   ⚠️  未设置 DATABASE_URL，应用可能使用默认的本地数据库配置');
    }

    console.log('\n✅ 对比完成！');

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
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

compareDatabases();


