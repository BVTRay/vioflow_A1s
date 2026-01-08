import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWechatFields1737000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加微信相关字段到 users 表
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "wechat_openid" varchar(100),
      ADD COLUMN IF NOT EXISTS "wechat_unionid" varchar(100),
      ADD COLUMN IF NOT EXISTS "wechat_session_key" varchar(200);
    `);

    // 创建索引以提高查询性能
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_wechat_openid" ON "users"("wechat_openid");
      CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users"("phone");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_wechat_openid";
      DROP INDEX IF EXISTS "idx_users_phone";
    `);

    // 删除字段
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "wechat_openid",
      DROP COLUMN IF EXISTS "wechat_unionid",
      DROP COLUMN IF EXISTS "wechat_session_key";
    `);
  }
}






