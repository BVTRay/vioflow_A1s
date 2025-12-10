import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Delivery } from './delivery.entity';

export enum FolderType {
  MASTER = 'master',
  VARIANTS = 'variants',
  CLEAN_FEED = 'clean_feed',
  DOCS = 'docs',
}

@Entity('delivery_folders')
export class DeliveryFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  delivery_id: string;

  @Column({
    type: 'enum',
    enum: FolderType,
  })
  folder_type: FolderType;

  @Column({ length: 500 })
  storage_path: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Delivery, (delivery) => delivery.folders)
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;
}

