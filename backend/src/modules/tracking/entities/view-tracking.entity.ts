import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShowcasePackage } from '../../showcase/entities/showcase-package.entity';
import { Video } from '../../videos/entities/video.entity';

@Entity('showcase_view_tracking')
export class ViewTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  package_id: string;

  @Column('uuid')
  video_id: string;

  @Column({ length: 45 })
  viewer_ip: string;

  @Column({ length: 500 })
  viewer_user_agent: string;

  @Column()
  progress: number;

  @Column()
  duration_watched: number;

  @Column()
  last_updated_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ShowcasePackage)
  @JoinColumn({ name: 'package_id' })
  package: ShowcasePackage;

  @ManyToOne(() => Video)
  @JoinColumn({ name: 'video_id' })
  video: Video;
}

