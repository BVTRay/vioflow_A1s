import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';

@Entity('storage_usage')
export class StorageUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  team_id: string;

  @Column('bigint', { default: 0 })
  total_size: number;

  @Column('bigint', { default: 0 })
  standard_size: number;

  @Column('bigint', { default: 0 })
  cold_size: number;

  @Column({ default: 0 })
  file_count: number;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Team, (team) => team.storage_usage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}


