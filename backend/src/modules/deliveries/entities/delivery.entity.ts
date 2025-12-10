import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { DeliveryFolder } from './delivery-folder.entity';
import { DeliveryFile } from './delivery-file.entity';
import { DeliveryPackage } from './delivery-package.entity';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  project_id: string;

  @Column({ default: false })
  has_clean_feed: boolean;

  @Column({ default: false })
  has_multi_resolution: boolean;

  @Column({ default: false })
  has_script: boolean;

  @Column({ default: false })
  has_copyright_files: boolean;

  @Column({ default: false })
  has_tech_review: boolean;

  @Column({ default: false })
  has_copyright_check: boolean;

  @Column({ default: false })
  has_metadata: boolean;

  @Column({ type: 'text', nullable: true })
  delivery_note: string;

  @Column({ nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => Project, (project) => project.delivery)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => DeliveryFolder, (folder) => folder.delivery)
  folders: DeliveryFolder[];

  @OneToMany(() => DeliveryFile, (file) => file.delivery)
  files: DeliveryFile[];

  @OneToMany(() => DeliveryPackage, (pkg) => pkg.delivery)
  packages: DeliveryPackage[];
}

