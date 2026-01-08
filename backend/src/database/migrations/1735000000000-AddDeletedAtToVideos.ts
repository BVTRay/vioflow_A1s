import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToVideos1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'videos',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('videos', 'deleted_at');
  }
}



















