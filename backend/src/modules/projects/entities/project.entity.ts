import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Video } from '../../videos/entities/video.entity';
import { Delivery } from '../../deliveries/entities/delivery.entity';

export enum ProjectStatus {
  ACTIVE = 'active',
  FINALIZED = 'finalized',
  DELIVERED = 'delivered',
  ARCHIVED = 'archived',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  client: string;

  @Column({ length: 100 })
  lead: string;

  @Column({ length: 100 })
  post_lead: string;

  @Column({ length: 100 })
  group: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @Column({ type: 'date' })
  created_date: Date;

  @Column({ nullable: true })
  last_activity_at: Date;

  @Column({ nullable: true })
  last_opened_at: Date;

  @Column({ nullable: true })
  archived_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  finalized_at: Date;

  @Column({ nullable: true })
  delivered_at: Date;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @OneToMany(() => Video, (video) => video.project)
  videos: Video[];

  @OneToOne(() => Delivery, (delivery) => delivery.project)
  delivery: Delivery;
}

