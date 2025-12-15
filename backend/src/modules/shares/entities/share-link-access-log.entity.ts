import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ShareLink } from './share-link.entity';

export enum AccessAction {
  VIEW = 'view',
  DOWNLOAD = 'download',
}

@Entity('share_link_access_logs')
export class ShareLinkAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  share_link_id: string;

  @Column({
    type: 'enum',
    enum: AccessAction,
  })
  action: AccessAction;

  @Column({ length: 45, nullable: true })
  viewer_ip: string;

  @Column({ length: 500, nullable: true })
  viewer_user_agent: string;

  @Column({ length: 255, nullable: true })
  viewer_email: string;

  @Column({ length: 100, nullable: true })
  viewer_name: string;

  @Column({ length: 50, nullable: true })
  resource_type: string; // 'video', 'delivery_package', 'showcase_package'

  @Column('uuid', { nullable: true })
  resource_id: string;

  @Column({ length: 255, nullable: true })
  file_name: string;

  @Column('bigint', { nullable: true })
  file_size: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ShareLink, (shareLink) => shareLink.access_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'share_link_id' })
  share_link: ShareLink;
}


