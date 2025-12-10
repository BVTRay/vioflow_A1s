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

