import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowcasePackage, ShowcaseMode } from './entities/showcase-package.entity';
import { ShowcasePackageVideo } from './entities/showcase-package-video.entity';
import { SharesService } from '../shares/shares.service';

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(ShowcasePackage)
    private packageRepository: Repository<ShowcasePackage>,
    @InjectRepository(ShowcasePackageVideo)
    private packageVideoRepository: Repository<ShowcasePackageVideo>,
    private sharesService: SharesService,
  ) {}

  async findAll(): Promise<ShowcasePackage[]> {
    return this.packageRepository.find({
      relations: ['videos', 'videos.video'],
      order: { created_at: 'DESC' },
    });
  }

  async create(data: {
    name: string;
    description: string;
    mode: string;
    clientName?: string;
    videoIds: string[];
    createdBy: string;
  }): Promise<ShowcasePackage> {
    const pkg = this.packageRepository.create({
      name: data.name,
      description: data.description,
      mode: data.mode as ShowcaseMode,
      client_name: data.clientName,
      created_by: data.createdBy,
    });
    const savedPackage = await this.packageRepository.save(pkg);

    // 添加视频
    for (let i = 0; i < data.videoIds.length; i++) {
      const packageVideo = this.packageVideoRepository.create({
        package_id: savedPackage.id,
        video_id: data.videoIds[i],
        order: i + 1,
      });
      await this.packageVideoRepository.save(packageVideo);
    }

    return this.findOne(savedPackage.id);
  }

  async findOne(id: string): Promise<ShowcasePackage> {
    return this.packageRepository.findOne({
      where: { id },
      relations: ['videos', 'videos.video'],
    });
  }

  async getTracking(id: string): Promise<any> {
    // TODO: 实现观看追踪统计
    return { packageId: id, views: 0 };
  }

  async generateLink(id: string): Promise<any> {
    const pkg = await this.findOne(id);
    const shareLink = await this.sharesService.createShareLink({
      type: 'showcase_package',
      createdBy: pkg.created_by,
    });
    
    pkg.share_link_id = shareLink.id;
    await this.packageRepository.save(pkg);
    
    return { link: `https://vioflow.io/share/${shareLink.token}` };
  }
}

