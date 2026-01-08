import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

const execAsync = promisify(exec);

// 加载环境变量
config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.DATABASE_URL;
const LOCAL_CONFIG = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: 'vioflow2026',
  database: 'vioflow_mam',
};

async function exportFromSupabase(): Promise<string> {
  if (!SUPABASE_URL) {
    throw new Error('❌ 未找到 DATABASE_URL 环境变量');
  }

  console.log('================================================');
  console.log('  从 Supabase 导出数据到本地');
  console.log('================================================\n');

  // 解析 DATABASE_URL 并处理特殊字符
  const urlObj = new URL(SUPABASE_URL);
  const dbConfig = {
    host: urlObj.hostname,
    port: urlObj.port || '5432',
    user: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    database: urlObj.pathname.slice(1),
  };

  // 创建导出目录
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const exportDir = path.join(__dirname, `../../database_export_${timestamp}`);
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const sqlFile = path.join(exportDir, 'full_database.sql');

  console.log('📂 导出目录:', exportDir);
  console.log(`📡 连接到 Supabase: ${dbConfig.host}`);
  console.log(`📊 数据库: ${dbConfig.database}\n`);

  // 设置密码环境变量
  process.env.PGPASSWORD = dbConfig.password;

  // 使用 pg_dump 导出（使用分离的参数而不是 URL）
  // 添加 --no-sync 避免版本检查问题
  const dumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --no-owner --no-privileges --clean --if-exists --no-sync -f "${sqlFile}"`;

  try {
    console.log('📋 导出数据库结构和数据...');
    const { stdout, stderr } = await execAsync(dumpCommand);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.log('⚠️  警告:', stderr);
    }

    const stats = fs.statSync(sqlFile);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('✅ 数据库导出成功!');
    console.log(`📁 文件位置: ${sqlFile}`);
    console.log(`📊 文件大小: ${fileSizeMB} MB\n`);

    return sqlFile;
  } catch (error: any) {
    console.error('❌ 导出失败:', error.message);
    throw error;
  }
}

async function importToLocal(sqlFile: string): Promise<void> {
  console.log('================================================');
  console.log('  导入数据到本地 PostgreSQL');
  console.log('================================================\n');

  console.log('📁 SQL 文件:', sqlFile);
  
  const stats = fs.statSync(sqlFile);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📊 文件大小: ${fileSizeMB} MB\n`);

  // 设置 PGPASSWORD 环境变量
  process.env.PGPASSWORD = LOCAL_CONFIG.password;

  try {
    // 清空现有数据库
    console.log('🗑️  清空现有数据库...');
    const dropCommand = `psql -h ${LOCAL_CONFIG.host} -p ${LOCAL_CONFIG.port} -U ${LOCAL_CONFIG.user} -d ${LOCAL_CONFIG.database} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
    await execAsync(dropCommand);

    // 过滤 SQL 文件，移除 Supabase 特有的扩展
    console.log('🔧 处理 SQL 文件，移除 Supabase 特有扩展...');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    const filteredSql = sqlContent
      .split('\n')
      .filter(line => {
        // 跳过 Supabase 特有的扩展
        return !(
          line.includes('pg_graphql') ||
          line.includes('pg_stat_statements') ||
          line.includes('pgcrypto') ||
          line.includes('pgjwt') ||
          line.includes('supabase_') ||
          line.includes('vault') ||
          line.includes('pg_net') ||
          line.includes('http')
        );
      })
      .join('\n');
    
    const filteredSqlFile = sqlFile.replace('.sql', '_filtered.sql');
    fs.writeFileSync(filteredSqlFile, filteredSql);
    
    console.log('✅ SQL 文件已处理\n');

    // 导入数据（不使用 ON_ERROR_STOP，以便跳过扩展相关错误）
    console.log('📥 开始导入数据...');
    console.log('   这可能需要几分钟时间，请耐心等待...\n');

    const importCommand = `psql -h ${LOCAL_CONFIG.host} -p ${LOCAL_CONFIG.port} -U ${LOCAL_CONFIG.user} -d ${LOCAL_CONFIG.database} -f "${filteredSqlFile}" --quiet`;
    
    const { stdout, stderr } = await execAsync(importCommand, {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });

    if (stderr && !stderr.includes('NOTICE')) {
      console.log('⚠️  导入警告:', stderr.substring(0, 500));
    }

    console.log('\n✅ 数据导入成功!\n');

    // 验证数据
    console.log('📊 验证数据...\n');
    const verifyCommand = `psql -h ${LOCAL_CONFIG.host} -p ${LOCAL_CONFIG.port} -U ${LOCAL_CONFIG.user} -d ${LOCAL_CONFIG.database} -c "SELECT tablename, (xpath('/row/count/text()', query_to_xml(format('SELECT COUNT(*) FROM %I', tablename), false, true, '')))[1]::text::int AS row_count FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'teams', 'projects', 'videos', 'annotations') ORDER BY tablename;"`;
    
    const { stdout: verifyOutput } = await execAsync(verifyCommand);
    console.log(verifyOutput);

    console.log('✨ 迁移完成！\n');
    
  } catch (error: any) {
    console.error('❌ 导入失败:', error.message);
    if (error.stderr) {
      console.error('错误详情:', error.stderr);
    }
    throw error;
  }
}

async function main() {
  try {
    // 第一步：导出
    const sqlFile = await exportFromSupabase();

    // 第二步：导入
    await importToLocal(sqlFile);

    console.log('📝 下一步:');
    console.log('   1. 修改 .env 配置，注释掉 DATABASE_URL，使用本地数据库配置');
    console.log('   2. 重启应用服务\n');

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

main();

