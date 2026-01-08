import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { ShareLink } from '../../shares/entities/share-link.entity';
import { User } from '../../users/entities/user.entity';
import { ShowcasePackageVideo } from './showcase-package-video.entity';

export enum ShowcaseMode {
  QUICK_PLAYER = 'quick_player',
  PITCH_PAGE = 'pitch_page',
}

@Entity('showcase_packages')
export class ShowcasePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ShowcaseMode,
  })
  mode: ShowcaseMode;

  @Column({ length: 100, nullable: true })
  client_name: string;

  @Column({ type: 'text', nullable: true })
  welcome_message: string;

  @Column({ type: 'text', nullable: true })
  contact_info: string;

  @Column('uuid', { nullable: true })
  share_link_id: string;

  @Column('uuid')
  created_by: string;

  @Column('uuid', { nullable: true })
  sales_user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => ShareLink, { nullable: true })
  @JoinColumn({ name: 'share_link_id' })
  share_link: ShareLink;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sales_user_id' })
  sales_user: User;

  @OneToMany(() => ShowcasePackageVideo, (video) => video.package)
  videos: ShowcasePackageVideo[];
}

