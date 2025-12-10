import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Video } from './video.entity';
import { Tag } from '../../tags/entities/tag.entity';

@Entity('video_tags')
@Unique(['video_id', 'tag_id'])
export class VideoTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  video_id: string;

  @Column('uuid')
  tag_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Video, (video) => video.video_tags)
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ManyToOne(() => Tag, (tag) => tag.video_tags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}

