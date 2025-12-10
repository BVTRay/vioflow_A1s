import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';
import { DeliveryFolder, FolderType } from './entities/delivery-folder.entity';
import { DeliveryPackage } from './entities/delivery-package.entity';
import { DeliveryPackageFile } from './entities/delivery-package-file.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(DeliveryFolder)
    private folderRepository: Repository<DeliveryFolder>,
    @InjectRepository(DeliveryPackage)
    private packageRepository: Repository<DeliveryPackage>,
    @InjectRepository(DeliveryPackageFile)
    private packageFileRepository: Repository<DeliveryPackageFile>,
  ) {}

  async findAll(): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      relations: ['project', 'folders', 'files', 'packages'],
    });
  }

  async findByProjectId(projectId: string): Promise<Delivery> {
    let delivery = await this.deliveryRepository.findOne({
      where: { project_id: projectId },
      relations: ['folders', 'files', 'packages'],
    });
    
    if (!delivery) {
      // 如果不存在，创建一个新的交付记录
      delivery = this.deliveryRepository.create({
        project_id: projectId,
      });
      delivery = await this.deliveryRepository.save(delivery);
    }
    
    return delivery;
  }

  async update(projectId: string, data: any): Promise<Delivery> {
    const delivery = await this.findByProjectId(projectId);
    Object.assign(delivery, data);
    return this.deliveryRepository.save(delivery);
  }

  async completeDelivery(projectId: string): Promise<Delivery> {
    const delivery = await this.findByProjectId(projectId);
    delivery.completed_at = new Date();

    // 自动创建标准文件夹结构（如果还没有）
    const existingFolders = await this.folderRepository.find({
      where: { delivery_id: delivery.id },
    });

    if (existingFolders.length === 0) {
      const folderTypes = [FolderType.MASTER, FolderType.VARIANTS, FolderType.CLEAN_FEED, FolderType.DOCS];
      for (const folderType of folderTypes) {
        const folder = this.folderRepository.create({
          delivery_id: delivery.id,
          folder_type: folderType,
          storage_path: `deliveries/${projectId}/${folderType}`,
        });
        await this.folderRepository.save(folder);
      }
    }

    return this.deliveryRepository.save(delivery);
  }

  async getFolders(projectId: string): Promise<DeliveryFolder[]> {
    const delivery = await this.findByProjectId(projectId);
    return this.folderRepository.find({
      where: { delivery_id: delivery.id },
    });
  }

  async getPackages(projectId: string): Promise<DeliveryPackage[]> {
    const delivery = await this.findByProjectId(projectId);
    return this.packageRepository.find({
      where: { delivery_id: delivery.id },
      relations: ['share_link'],
      order: { created_at: 'DESC' },
    });
  }

  async createPackage(projectId: string, data: { title: string; description: string; fileIds: string[] }): Promise<DeliveryPackage> {
    const delivery = await this.findByProjectId(projectId);
    const pkg = this.packageRepository.create({
      delivery_id: delivery.id,
      title: data.title,
      description: data.description,
      created_by: 'system', // TODO: 从请求中获取用户ID
    });
    const savedPackage = await this.packageRepository.save(pkg);

    // 添加文件关联
    for (const fileId of data.fileIds) {
      const packageFile = this.packageFileRepository.create({
        package_id: savedPackage.id,
        file_id: fileId,
      });
      await this.packageFileRepository.save(packageFile);
    }

    return savedPackage;
  }
}

