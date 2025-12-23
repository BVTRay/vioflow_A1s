import { DataSource } from 'typeorm';
import dataSource from './data-source';

async function addDeletedAtColumn() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    const queryRunner = dataSource.createQueryRunner();
    
    // 检查列是否已存在
    const table = await queryRunner.getTable('videos');
    const hasDeletedAt = table?.columns.find(col => col.name === 'deleted_at');
    
    if (hasDeletedAt) {
      console.log('✅ deleted_at 字段已存在，无需添加');
    } else {
      await queryRunner.query(`
        ALTER TABLE videos 
        ADD COLUMN deleted_at timestamp;
      `);
      console.log('✅ 成功添加 deleted_at 字段');
    }
    
    await queryRunner.release();
    await dataSource.destroy();
    console.log('✅ 完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

addDeletedAtColumn();


