import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

export enum ArchivingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('archiving_tasks')
export class ArchivingTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @Column({
    type: 'enum',
    enum: ArchivingStatus,
    default: ArchivingStatus.PENDING,
  })
  status: ArchivingStatus;

  @Column({ default: 0 })
  files_count: number;

  @Column('bigint', { default: 0 })
  total_size: number;

  @Column({ length: 500, nullable: true })
  cold_storage_path: string;

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

