import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TeamMember } from './team-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectGroup } from '../../project-groups/entities/project-group.entity';
import { StorageUsage } from '../../storage/entities/storage-usage.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 12, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];

  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];

  @OneToMany(() => ProjectGroup, (group) => group.team)
  project_groups: ProjectGroup[];

  @OneToMany(() => StorageUsage, (usage) => usage.team)
  storage_usage: StorageUsage[];
}

