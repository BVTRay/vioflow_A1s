import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1736000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Videos表索引优化
    // 组合索引：用于按项目、基础名称和版本查询
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_project_base_version" 
      ON "videos"("project_id", "base_name", "version");
    `);

    // 软删除查询索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_deleted_at" 
      ON "videos"("deleted_at") 
      WHERE "deleted_at" IS NULL;
    `);

    // 项目ID和删除状态组合索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_project_deleted" 
      ON "videos"("project_id", "deleted_at");
    `);

    // 上传时间索引（用于排序）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_upload_time" 
      ON "videos"("upload_time" DESC);
    `);

    // 案例文件查询索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_case_file" 
      ON "videos"("is_case_file") 
      WHERE "is_case_file" = true;
    `);

    // Projects表索引优化
    // 团队ID和状态组合索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_team_status" 
      ON "projects"("team_id", "status");
    `);

    // 创建日期索引（用于排序和筛选）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_created_date" 
      ON "projects"("created_date" DESC);
    `);

    // 团队ID和创建日期组合索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_team_created" 
      ON "projects"("team_id", "created_date" DESC);
    `);

    // 搜索优化：项目名称全文搜索索引（如果支持）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_name_trgm" 
      ON "projects" USING gin("name" gin_trgm_ops);
    `).catch(() => {
      // 如果pg_trgm扩展未启用，忽略此索引
      console.warn('pg_trgm extension not available, skipping trigram index');
    });

    // Videos表名称搜索索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_videos_name_trgm" 
      ON "videos" USING gin("name" gin_trgm_ops);
    `).catch(() => {
      console.warn('pg_trgm extension not available, skipping trigram index');
    });

    // VideoTags表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_video_tags_video_id" 
      ON "video_tags"("video_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_video_tags_tag_id" 
      ON "video_tags"("tag_id");
    `);

    // 唯一约束索引（如果不存在）
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_tags_unique" 
      ON "video_tags"("video_id", "tag_id");
    `);

    // ProjectMembers表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_members_project" 
      ON "project_members"("project_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_project_members_user" 
      ON "project_members"("user_id");
    `);

    // TeamMembers表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_team_members_team" 
      ON "team_members"("team_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_team_members_user" 
      ON "team_members"("user_id");
    `);

    // AuditLogs表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_team_created" 
      ON "audit_logs"("team_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" 
      ON "audit_logs"("resource_type", "resource_id");
    `);

    // ShareLinks表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_share_links_project" 
      ON "share_links"("project_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_share_links_token" 
      ON "share_links"("token");
    `);

    // ShareLinkAccessLogs表优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_share_access_logs_share" 
      ON "share_link_access_logs"("share_link_id", "accessed_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除所有创建的索引
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_project_base_version";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_deleted_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_project_deleted";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_upload_time";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_case_file";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_team_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_created_date";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_team_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_name_trgm";`).catch(() => {});
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_videos_name_trgm";`).catch(() => {});
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_video_tags_video_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_video_tags_tag_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_video_tags_unique";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_members_project";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_members_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_team_members_team";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_team_members_user";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_team_created";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_resource";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_share_links_project";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_share_links_token";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_share_access_logs_share";`);
  }
}




















