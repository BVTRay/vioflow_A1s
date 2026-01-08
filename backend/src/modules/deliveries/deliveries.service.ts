import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Delivery } from './entities/delivery.entity';
import { DeliveryFolder, FolderType } from './entities/delivery-folder.entity';
import { DeliveryPackage } from './entities/delivery-package.entity';
import { DeliveryPackageFile } from './entities/delivery-package-file.entity';
import { Video } from '../videos/entities/video.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { CreateDeliveryPackageDto } from './dto/create-delivery-package.dto';

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
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async findAll(): Promise<any[]> {
    const deliveries = await this.deliveryRepository.find({
      relations: ['project', 'folders', 'files', 'packages'],
    });
    return deliveries.map((delivery) => this.mapToResponse(delivery));
  }

  async findByProjectId(projectId: string): Promise<any> {
    console.log(`[DeliveriesService] 查找项目 ${projectId} 的交付数据`);
    const delivery = await this.getOrCreateDelivery(projectId);
    const result = this.mapToResponse(delivery);
    console.log(`[DeliveriesService] 返回交付数据:`, JSON.stringify(result, null, 2));
    return result;
  }

  async update(projectId: string, data: UpdateDeliveryDto): Promise<any> {
    const delivery = await this.getOrCreateDelivery(projectId);

    if (data.hasCleanFeed !== undefined) delivery.has_clean_feed = data.hasCleanFeed;
    if (data.hasMetadata !== undefined) delivery.has_metadata = data.hasMetadata;
    if (data.hasTechReview !== undefined) delivery.has_tech_review = data.hasTechReview;
    if (data.hasCopyrightCheck !== undefined) delivery.has_copyright_check = data.hasCopyrightCheck;
    if (data.hasScript !== undefined) delivery.has_script = data.hasScript;
    if (data.hasCopyrightFiles !== undefined) delivery.has_copyright_files = data.hasCopyrightFiles;
    if (data.hasMultiResolution !== undefined) delivery.has_multi_resolution = data.hasMultiResolution;
    if (data.deliveryNote !== undefined) delivery.delivery_note = data.deliveryNote;

    const saved = await this.deliveryRepository.save(delivery);
    return this.mapToResponse(saved);
  }

  async completeDelivery(projectId: string): Promise<any> {
    const delivery = await this.getOrCreateDelivery(projectId);

    // 关键交付前置校验
    if (!delivery.has_clean_feed) {
      throw new BadRequestException('请先上传净版视频（Clean Feed）');
    }
    if (!delivery.has_tech_review) {
      throw new BadRequestException('请先完成技术审查');
    }
    if (!delivery.has_copyright_check) {
      throw new BadRequestException('请先完成版权风险确认');
    }
    if (!delivery.has_metadata) {
      throw new BadRequestException('请先确认元数据完整');
    }
    if (!delivery.delivery_note || !delivery.delivery_note.trim()) {
      throw new BadRequestException('请填写交付说明');
    }

    // 校验必须指定主交付文件
    const mainDeliveryVideos = await this.videoRepository.find({
      where: {
        project_id: projectId,
        is_main_delivery: true,
      },
    });

    if (mainDeliveryVideos.length === 0) {
      throw new BadRequestException('请至少指定一个主交付文件后再完成交付');
    }

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

    // 更新项目状态为 delivered
    await this.projectRepository.update(
      { id: projectId },
      { status: ProjectStatus.DELIVERED, delivered_at: new Date() }
    );

    // 将这些视频标记为案例文件
    if (mainDeliveryVideos.length > 0) {
      await this.videoRepository.update(
        { 
          project_id: projectId,
          is_main_delivery: true,
        },
        { 
          is_case_file: true,
        }
      );
      console.log(`✅ 自动标记 ${mainDeliveryVideos.length} 个主交付文件为案例文件`);
    }

    const saved = await this.deliveryRepository.save(delivery);
    return this.mapToResponse(saved);
  }

  async getFolders(projectId: string): Promise<DeliveryFolder[]> {
    const delivery = await this.getOrCreateDelivery(projectId);
    return this.folderRepository.find({
      where: { delivery_id: delivery.id },
    });
  }

  async getPackages(projectId: string): Promise<DeliveryPackage[]> {
    const delivery = await this.getOrCreateDelivery(projectId);
    return this.packageRepository.find({
      where: { delivery_id: delivery.id },
      relations: ['share_link'],
      order: { created_at: 'DESC' },
    });
  }

  async createPackage(projectId: string, data: CreateDeliveryPackageDto): Promise<DeliveryPackage> {
    const delivery = await this.getOrCreateDelivery(projectId);
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

  private async getOrCreateDelivery(projectId: string): Promise<Delivery> {
    let delivery = await this.deliveryRepository.findOne({
      where: { project_id: projectId },
      relations: ['folders', 'files', 'packages'],
    });

    if (!delivery) {
      delivery = this.deliveryRepository.create({ project_id: projectId });
      delivery = await this.deliveryRepository.save(delivery);
      console.log(`[DeliveriesService] 已创建交付记录，ID: ${delivery.id}`);
    }
    return delivery;
  }

  private mapToResponse(delivery: Delivery) {
    return {
      projectId: delivery.project_id,
      hasCleanFeed: delivery.has_clean_feed,
      hasMusicAuth: false, // 占位字段
      hasMetadata: delivery.has_metadata,
      hasTechReview: delivery.has_tech_review,
      hasCopyrightCheck: delivery.has_copyright_check,
      hasScript: delivery.has_script,
      hasCopyrightFiles: delivery.has_copyright_files,
      hasMultiResolution: delivery.has_multi_resolution,
      deliveryNote: delivery.delivery_note,
      deliveryPackages: delivery.packages || [],
    };
  }
}

