import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Delivery } from './delivery.entity';
import { ShareLink } from '../../shares/entities/share-link.entity';
import { User } from '../../users/entities/user.entity';
import { DeliveryPackageFile } from './delivery-package-file.entity';

@Entity('delivery_packages')
export class DeliveryPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  delivery_id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('uuid', { nullable: true })
  share_link_id: string;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Delivery, (delivery) => delivery.packages)
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;

  @OneToOne(() => ShareLink, { nullable: true })
  @JoinColumn({ name: 'share_link_id' })
  share_link: ShareLink;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => DeliveryPackageFile, (file) => file.package)
  files: DeliveryPackageFile[];
}

