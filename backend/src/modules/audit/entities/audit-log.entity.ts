import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  team_id: string;

  @Column('uuid')
  user_id: string;

  @Column({ length: 50 })
  action: string; // 'create', 'update', 'delete', 'permission_change'

  @Column({ length: 50 })
  resource_type: string; // 'project', 'video', 'delivery', 'team_member'

  @Column('uuid', { nullable: true })
  resource_id: string;

  @Column({ type: 'jsonb', nullable: true })
  old_value: any;

  @Column({ type: 'jsonb', nullable: true })
  new_value: any;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @Column({ length: 500, nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

