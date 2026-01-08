import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

config({ path: path.join(__dirname, '../../../.env') });

// 支持从环境变量或直接传入连接字符串
let databaseUrl = process.env.DATABASE_URL;

// 如果环境变量中没有，尝试从参数获取
if (process.argv.length > 2 && process.argv[2]) {
  databaseUrl = process.argv[2];
}

if (!databaseUrl) {
  console.error('❌ 错误: 未找到 DATABASE_URL');
  console.log('\n使用方法:');
  console.log('  1. 设置环境变量 DATABASE_URL');
  console.log('  2. 或作为参数传入: npm run db:helper "postgresql://..."');
  process.exit(1);
}

// 解析数据库连接配置
let dataSourceConfig: any;

try {
  const urlObj = new URL(databaseUrl);
  const isSupabase = databaseUrl.includes('supabase') || databaseUrl.includes('pooler.supabase.com');
  
  dataSourceConfig = {
    type: 'postgres',
    host: urlObj.hostname,
    port: parseInt(urlObj.port, 10) || 5432,
    username: decodeURIComponent(urlObj.username),
    password: decodeURIComponent(urlObj.password),
    database: urlObj.pathname.slice(1), // 移除前导斜杠
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  };
} catch (error) {
  console.error('❌ 错误: DATABASE_URL 格式不正确');
  process.exit(1);
}

const dataSource = new DataSource({
  ...dataSourceConfig,
  synchronize: false,
  logging: false,
});

// 数据库操作类
export class SupabaseHelper {
  private static instance: SupabaseHelper;
  private dataSource: DataSource;

  private constructor() {
    this.dataSource = dataSource;
  }

  static async getInstance(): Promise<SupabaseHelper> {
    if (!SupabaseHelper.instance) {
      SupabaseHelper.instance = new SupabaseHelper();
      await SupabaseHelper.instance.connect();
    }
    return SupabaseHelper.instance;
  }

  async connect(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      console.log('正在连接 Supabase 数据库...');
      await this.dataSource.initialize();
      console.log('✓ 数据库连接成功\n');
    }
  }

  async disconnect(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      console.log('✓ 数据库连接已关闭');
    }
  }

  // 执行原始 SQL 查询
  async query(sql: string, parameters?: any[]): Promise<any> {
    return await this.dataSource.query(sql, parameters);
  }

  // 执行 SQL 文件
  async executeFile(filePath: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(__dirname, '../..', filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在: ${fullPath}`);
    }

    const sql = fs.readFileSync(fullPath, 'utf-8');
    
    console.log(`正在执行 SQL 文件: ${filePath}`);
    console.log(`文件大小: ${(sql.length / 1024).toFixed(2)} KB\n`);

    try {
      // 直接执行整个 SQL 文件（PostgreSQL 支持多语句执行）
      await this.dataSource.query(sql);
      console.log('✓ SQL 文件执行完成');
    } catch (error: any) {
      // 某些错误可以忽略（如 IF NOT EXISTS）
      if (error.message.includes('already exists') || 
          error.message.includes('does not exist') ||
          error.message.includes('duplicate') ||
          error.message.includes('IF NOT EXISTS')) {
        console.log('⚠ 部分语句已存在，继续执行...');
        // 如果是因为已存在而失败，尝试逐条执行
        await this.executeFileLineByLine(sql);
      } else {
        console.error('✗ SQL 文件执行失败:', error.message);
        throw error;
      }
    }
  }

  // 逐条执行 SQL（备用方法）
  private async executeFileLineByLine(sql: string): Promise<void> {
    // 移除注释行
    const lines = sql.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
    
    const cleanedSql = lines.join('\n');
    
    // 按分号分割，但保留 DO 块等复杂结构
    const statements: string[] = [];
    let currentStatement = '';
    let inDoBlock = false;
    let braceCount = 0;
    
    for (const line of cleanedSql.split('\n')) {
      currentStatement += line + '\n';
      
      if (line.trim().toUpperCase().startsWith('DO $$')) {
        inDoBlock = true;
      }
      
      if (inDoBlock) {
        braceCount += (line.match(/\$\$/g) || []).length;
        if (braceCount >= 2) {
          inDoBlock = false;
          braceCount = 0;
        }
      }
      
      if (!inDoBlock && line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`将分 ${statements.length} 条语句执行\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await this.dataSource.query(statement);
          console.log(`✓ [${i + 1}/${statements.length}] 执行成功`);
        } catch (error: any) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate')) {
            console.log(`⚠ [${i + 1}/${statements.length}] 跳过（已存在）`);
          } else {
            console.error(`✗ [${i + 1}/${statements.length}] 执行失败:`, error.message);
            // 不抛出错误，继续执行下一条
          }
        }
      }
    }
  }

  // 获取所有表
  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    return result.map((r: any) => r.table_name);
  }

  // 获取表结构
  async getTableStructure(tableName: string): Promise<any[]> {
    return await this.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
  }

  // 获取表数据量
  async getTableCount(tableName: string): Promise<number> {
    const result = await this.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return parseInt(result[0]?.count || '0');
  }

  // 检查表是否存在
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = $1
      );
    `, [tableName]);
    return result[0]?.exists || false;
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      const helper = await SupabaseHelper.getInstance();
      
      // 测试连接
      const isConnected = await helper.testConnection();
      if (!isConnected) {
        throw new Error('数据库连接测试失败');
      }
      
      console.log('✓ 数据库连接测试成功\n');
      
      // 显示表列表
      const tables = await helper.getTables();
      console.log(`找到 ${tables.length} 个表:\n`);
      for (const table of tables) {
        const count = await helper.getTableCount(table);
        console.log(`  - ${table}: ${count} 条记录`);
      }
      
      await helper.disconnect();
    } catch (error: any) {
      console.error('❌ 错误:', error.message);
      process.exit(1);
    }
  })();
}

