import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { Annotation } from '../../annotations/entities/annotation.entity';
import { VideoTag } from './video-tag.entity';

export enum VideoType {
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
}

export enum VideoStatus {
  INITIAL = 'initial',
  ANNOTATED = 'annotated',
  APPROVED = 'approved',
}

export enum StorageTier {
  STANDARD = 'standard',
  COLD = 'cold',
}

export enum AspectRatio {
  LANDSCAPE = 'landscape',
  PORTRAIT = 'portrait',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  original_filename: string;

  @Column({ length: 255 })
  base_name: string;

  @Column()
  version: number;

  @Column({
    type: 'enum',
    enum: VideoType,
    default: VideoType.VIDEO,
  })
  type: VideoType;

  @Column({ length: 500 })
  storage_url: string;

  @Column({ length: 500 })
  storage_key: string;

  @Column({
    type: 'enum',
    enum: StorageTier,
    default: StorageTier.STANDARD,
  })
  storage_tier: StorageTier;

  @Column({ length: 500, nullable: true })
  thumbnail_url: string;

  @Column('bigint')
  size: number;

  @Column({ nullable: true })
  duration: number;

  @Column({ length: 20, nullable: true })
  resolution: string;

  @Column({
    type: 'enum',
    enum: AspectRatio,
    nullable: true,
  })
  aspect_ratio: AspectRatio;

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.INITIAL,
  })
  status: VideoStatus;

  @Column({ default: 0 })
  annotation_count: number;

  @Column({ type: 'text', nullable: true })
  change_log: string;

  @Column({ default: false })
  is_case_file: boolean;

  @Column({ default: false })
  is_main_delivery: boolean;

  @Column({ default: false })
  is_reference: boolean;

  @Column('uuid', { nullable: true })
  referenced_video_id: string;

  @Column('uuid')
  uploader_id: string;

  @Column()
  upload_time: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => Project, (project) => project.videos)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @OneToMany(() => VideoTag, (videoTag) => videoTag.video)
  video_tags: VideoTag[];

  @OneToMany(() => Annotation, (annotation) => annotation.video)
  annotations: Annotation[];

  @ManyToOne(() => Video, { nullable: true })
  @JoinColumn({ name: 'referenced_video_id' })
  referenced_video: Video;
}

