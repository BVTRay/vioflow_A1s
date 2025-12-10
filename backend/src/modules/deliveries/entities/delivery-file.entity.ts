import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Delivery } from './delivery.entity';
import { DeliveryFolder } from './delivery-folder.entity';
import { User } from '../../users/entities/user.entity';

export enum DeliveryFileType {
  MASTER = 'master',
  VARIANT = 'variant',
  CLEAN_FEED = 'clean_feed',
  SCRIPT = 'script',
  COPYRIGHT_MUSIC = 'copyright_music',
  COPYRIGHT_VIDEO = 'copyright_video',
  COPYRIGHT_FONT = 'copyright_font',
}

@Entity('delivery_files')
export class DeliveryFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  delivery_id: string;

  @Column('uuid', { nullable: true })
  folder_id: string;

  @Column({
    type: 'enum',
    enum: DeliveryFileType,
  })
  file_type: DeliveryFileType;

  @Column({ length: 500 })
  storage_url: string;

  @Column({ length: 500 })
  storage_key: string;

  @Column({ length: 255 })
  filename: string;

  @Column('bigint')
  size: number;

  @Column('uuid')
  uploaded_by: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Delivery, (delivery) => delivery.files)
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;

  @ManyToOne(() => DeliveryFolder, { nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder: DeliveryFolder;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;
}

