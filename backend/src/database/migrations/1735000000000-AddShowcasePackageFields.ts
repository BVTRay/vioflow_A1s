import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowcasePackageFields1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 welcome_message 和 contact_info 字段到 showcase_packages 表
    await queryRunner.query(`
      ALTER TABLE "showcase_packages" 
      ADD COLUMN "welcome_message" text,
      ADD COLUMN "contact_info" text
    `);

    console.log('✅ Added welcome_message and contact_info columns to showcase_packages table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：删除添加的字段
    await queryRunner.query(`
      ALTER TABLE "showcase_packages" 
      DROP COLUMN "welcome_message",
      DROP COLUMN "contact_info"
    `);
  }
}











