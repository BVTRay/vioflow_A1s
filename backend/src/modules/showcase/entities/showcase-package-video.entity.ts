import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShowcasePackage } from './showcase-package.entity';
import { Video } from '../../videos/entities/video.entity';

@Entity('showcase_package_videos')
export class ShowcasePackageVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  package_id: string;

  @Column('uuid')
  video_id: string;

  @Column()
  order: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  group_name: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ShowcasePackage, (pkg) => pkg.videos)
  @JoinColumn({ name: 'package_id' })
  package: ShowcasePackage;

  @ManyToOne(() => Video)
  @JoinColumn({ name: 'video_id' })
  video: Video;
}

