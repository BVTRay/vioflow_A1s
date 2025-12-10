import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import * as path from 'path';
import { User } from '../../modules/users/entities/user.entity';

config({ path: path.join(__dirname, '../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vioflow_mam',
  entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
  synchronize: false,
  logging: false,
});

async function updatePasswords() {
  try {
    console.log('正在连接数据库...');
    await dataSource.initialize();
    console.log('✓ 数据库连接成功');

    const userRepository = dataSource.getRepository(User);
    
    // 生成新的密码哈希
    const newPasswordHash = await bcrypt.hash('admin', 10);
    
    // 更新所有用户的密码
    const result = await userRepository
      .createQueryBuilder()
      .update(User)
      .set({ password_hash: newPasswordHash })
      .execute();
    
    console.log(`✓ 已更新 ${result.affected} 个用户的密码为: admin`);
    
    await dataSource.destroy();
    console.log('✓ 密码更新完成');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ 密码更新失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n请确保 PostgreSQL 已启动并运行在端口 5432');
    }
    process.exit(1);
  }
}

updatePasswords();

