import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ShowcasePackage, ShowcaseMode } from './entities/showcase-package.entity';
import { ShowcasePackageVideo } from './entities/showcase-package-video.entity';
import { SharesService } from '../shares/shares.service';
import { ShareLink } from '../shares/entities/share-link.entity';

@Injectable()
export class ShowcaseService {
  constructor(
    @InjectRepository(ShowcasePackage)
    private packageRepository: Repository<ShowcasePackage>,
    @InjectRepository(ShowcasePackageVideo)
    private packageVideoRepository: Repository<ShowcasePackageVideo>,
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
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
    welcomeMessage?: string;
    contactInfo?: string;
    videoIds: string[];
    itemDescriptions?: Record<string, string>;
    createdBy: string;
  }): Promise<ShowcasePackage> {
    const pkg = this.packageRepository.create({
      name: data.name,
      description: data.description,
      mode: data.mode as ShowcaseMode,
      client_name: data.clientName || null,
      welcome_message: data.welcomeMessage || null,
      contact_info: data.contactInfo || null,
      created_by: data.createdBy,
    });
    const savedPackage = await this.packageRepository.save(pkg);

    // 添加视频
    for (let i = 0; i < data.videoIds.length; i++) {
      const videoId = data.videoIds[i];
      const packageVideo = this.packageVideoRepository.create({
        package_id: savedPackage.id,
        video_id: videoId,
        order: i + 1,
        description: data.itemDescriptions?.[videoId] || null,
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

  async generateLink(id: string, config?: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }): Promise<any> {
    const pkg = await this.findOne(id);
    
    // 如果已有链接，更新它；否则创建新链接
    let shareLink;
    if (pkg.share_link_id) {
      // 更新现有链接
      const linkData: any = {};
      if (config?.linkExpiry !== undefined) {
        if (config.linkExpiry > 0) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + config.linkExpiry);
          linkData.expiresAt = expiresAt.toISOString();
        } else {
          linkData.expiresAt = null;
        }
      }
      if (config?.requirePassword !== undefined) {
        linkData.hasPassword = config.requirePassword;
        if (config.requirePassword && config.password) {
          linkData.password = config.password;
        } else if (!config.requirePassword) {
          linkData.password = null;
        }
      }
      shareLink = await this.sharesService.update(pkg.share_link_id, linkData);
    } else {
      // 创建新链接
      const expiresAt = config?.linkExpiry && config.linkExpiry > 0
        ? (() => {
            const date = new Date();
            date.setDate(date.getDate() + config.linkExpiry);
            return date.toISOString();
          })()
        : undefined;
      
      shareLink = await this.sharesService.createShareLink({
        type: 'showcase_package',
        createdBy: pkg.created_by,
        hasPassword: config?.requirePassword,
        password: config?.requirePassword ? config.password : undefined,
        expiresAt,
      });
      
      pkg.share_link_id = shareLink.id;
      await this.packageRepository.save(pkg);
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'https://vioflow.io';
    const linkId = shareLink.token.substring(0, 8);
    const link = pkg.mode === ShowcaseMode.QUICK_PLAYER
      ? `${baseUrl}/play/${linkId}`
      : `${baseUrl}/pitch/${linkId}`;
    
    return { link, linkId };
  }

  async updateLink(id: string, config: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }): Promise<any> {
    const pkg = await this.findOne(id);
    if (!pkg.share_link_id) {
      throw new Error('案例包尚未生成链接');
    }

    const linkData: any = {};
    if (config.linkExpiry !== undefined) {
      if (config.linkExpiry > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + config.linkExpiry);
        linkData.expires_at = expiresAt.toISOString();
      } else {
        linkData.expires_at = null;
      }
    }
    if (config.requirePassword !== undefined) {
      if (config.requirePassword && config.password) {
        linkData.password_hash = await bcrypt.hash(config.password, 10);
      } else if (!config.requirePassword) {
        linkData.password_hash = null;
      }
    }

    const shareLink = await this.sharesService.update(pkg.share_link_id, linkData);
    return { success: true, shareLink };
  }

  async toggleLink(id: string): Promise<any> {
    const pkg = await this.findOne(id);
    if (!pkg.share_link_id) {
      throw new Error('案例包尚未生成链接');
    }

    const shareLink = await this.sharesService.toggle(pkg.share_link_id);
    return { success: true, isActive: shareLink.is_active };
  }

  async getByLinkId(linkId: string): Promise<any> {
    // linkId 是 token 的前8位，需要查找匹配的 ShareLink
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token: Like(`${linkId}%`) },
    });

    if (!shareLink) {
      throw new NotFoundException('链接不存在或已失效');
    }

    // 检查链接是否启用
    if (!shareLink.is_active) {
      throw new UnauthorizedException('链接已被禁用');
    }

    // 检查是否过期
    if (shareLink.expires_at) {
      const expiresAt = new Date(shareLink.expires_at);
      if (expiresAt < new Date()) {
        throw new UnauthorizedException('链接已过期');
      }
    }

    // 查找关联的案例包
    const pkg = await this.packageRepository.findOne({
      where: { share_link_id: shareLink.id },
      relations: ['videos', 'videos.video'],
    });

    if (!pkg) {
      throw new NotFoundException('案例包不存在');
    }

    // 构建返回数据
    const videos = pkg.videos
      .sort((a, b) => a.order - b.order)
      .map((pv) => ({
        id: pv.video.id,
        name: pv.video.name,
        storage_url: pv.video.storage_url,
        thumbnail_url: pv.video.thumbnail_url,
        duration: pv.video.duration,
        description: pv.description,
      }));

    // 构建 itemDescriptions 对象
    const itemDescriptions: Record<string, string> = {};
    pkg.videos.forEach((pv) => {
      if (pv.description) {
        itemDescriptions[pv.video.id] = pv.description;
      }
    });

    return {
      id: pkg.id,
      title: pkg.name,
      description: pkg.description,
      welcomeMessage: pkg.welcome_message,
      contactInfo: pkg.contact_info,
      mode: pkg.mode,
      clientName: pkg.client_name,
      videos,
      itemDescriptions,
      hasPassword: !!shareLink.password_hash,
      expiredAt: shareLink.expires_at,
    };
  }

  async verifyPassword(linkId: string, password: string): Promise<any> {
    // linkId 是 token 的前8位，需要查找匹配的 ShareLink
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token: Like(`${linkId}%`) },
    });

    if (!shareLink) {
      throw new NotFoundException('链接不存在或已失效');
    }

    if (!shareLink.password_hash) {
      return { success: true };
    }

    const isValid = await bcrypt.compare(password, shareLink.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('密码错误');
    }

    return { success: true };
  }
}

