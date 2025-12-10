import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryPackage } from './delivery-package.entity';
import { Video } from '../../videos/entities/video.entity';
import { DeliveryFile } from './delivery-file.entity';

@Entity('delivery_package_files')
export class DeliveryPackageFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  package_id: string;

  @Column('uuid', { nullable: true })
  video_id: string;

  @Column('uuid', { nullable: true })
  file_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => DeliveryPackage, (pkg) => pkg.files)
  @JoinColumn({ name: 'package_id' })
  package: DeliveryPackage;

  @ManyToOne(() => Video, { nullable: true })
  @JoinColumn({ name: 'video_id' })
  video: Video;

  @ManyToOne(() => DeliveryFile, { nullable: true })
  @JoinColumn({ name: 'file_id' })
  file: DeliveryFile;
}

