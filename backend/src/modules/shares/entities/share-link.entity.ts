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
import { Project } from '../../projects/entities/project.entity';
import { DeliveryPackage } from '../../deliveries/entities/delivery-package.entity';
import { ShowcasePackage } from '../../showcase/entities/showcase-package.entity';
import { User } from '../../users/entities/user.entity';

export enum ShareLinkType {
  VIDEO_REVIEW = 'video_review',
  VIDEO_SHARE = 'video_share',
  DELIVERY_PACKAGE = 'delivery_package',
  SHOWCASE_PACKAGE = 'showcase_package',
}

@Entity('share_links')
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  video_id: string;

  @Column('uuid', { nullable: true })
  project_id: string;

  @Column('uuid', { nullable: true })
  delivery_package_id: string;

  @Column('uuid', { nullable: true })
  showcase_package_id: string;

  @Column({
    type: 'enum',
    enum: ShareLinkType,
  })
  type: ShareLinkType;

  @Column({ length: 100, unique: true })
  token: string;

  @Column({ length: 255, nullable: true })
  password_hash: string;

  @Column({ default: false })
  allow_download: boolean;

  @Column({ nullable: true })
  expires_at: Date;

  @Column({ default: 0 })
  download_count: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Video, { nullable: true })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => DeliveryPackage, { nullable: true })
  @JoinColumn({ name: 'delivery_package_id' })
  delivery_package: DeliveryPackage;

  @ManyToOne(() => ShowcasePackage, { nullable: true })
  @JoinColumn({ name: 'showcase_package_id' })
  showcase_package: ShowcasePackage;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}

