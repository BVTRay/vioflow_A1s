import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedDatabase } from './seed';
import * as path from 'path';

config({ path: path.join(__dirname, '../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vioflow_mam',
  entities: [path.join(__dirname, '../../**/*.entity.ts')],
  synchronize: false,
  logging: false,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');
    
    await seedDatabase(dataSource);
    
    await dataSource.destroy();
    console.log('种子数据注入完成，数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('种子数据注入失败:', error);
    process.exit(1);
  }
}

runSeed();

