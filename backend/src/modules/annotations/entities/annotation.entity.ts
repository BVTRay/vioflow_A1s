import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Video } from '../../videos/entities/video.entity';
import { User } from '../../users/entities/user.entity';

// 批注者用户类型
export enum AnnotatorUserType {
  GUEST = 'guest',           // 访客
  TEAM_USER = 'team_user',   // 团队用户
  PERSONAL_USER = 'personal_user', // 个人用户
}

@Entity('annotations')
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  video_id: string;

  @Column('uuid', { nullable: true })
  user_id: string;

  @Column({ length: 20 })
  timecode: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 500, nullable: true })
  screenshot_url: string;

  @Column({ default: false })
  is_completed: boolean;

  @Column({ nullable: true })
  completed_at: Date;

  @Column({ length: 100, nullable: true })
  client_name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AnnotatorUserType.GUEST,
  })
  user_type: AnnotatorUserType;

  @Column({ length: 100, nullable: true })
  team_name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video, (video) => video.annotations)
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

