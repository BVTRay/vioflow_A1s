import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { ShareLink, ShareLinkType } from './entities/share-link.entity';
import { Annotation } from '../annotations/entities/annotation.entity';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
  ) {}

  async findAll(userId: string): Promise<ShareLink[]> {
    return this.shareLinkRepository.find({
      where: { created_by: userId },
      relations: ['video', 'project'],
      order: { created_at: 'DESC' },
    });
  }

  async createShareLink(data: {
    type: string;
    videoId?: string;
    projectId?: string;
    createdBy: string;
    allowDownload?: boolean;
    hasPassword?: boolean;
    password?: string;
    expiresAt?: string;
    justification?: string;
  }): Promise<ShareLink> {
    const token = uuidv4().replace(/-/g, '');
    const shareLink = this.shareLinkRepository.create({
      type: data.type as ShareLinkType,
      video_id: data.videoId,
      project_id: data.projectId,
      created_by: data.createdBy,
      token,
      is_active: true,
      allow_download: data.allowDownload || false,
      justification: data.justification,
      expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
    });

    if (data.hasPassword && data.password) {
      shareLink.password_hash = await bcrypt.hash(data.password, 10);
    }

    return this.shareLinkRepository.save(shareLink);
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
      relations: ['video', 'project'],
    });

    if (!shareLink) {
      return null;
    }

    // 检查是否过期
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return null;
    }

    // 如果是审阅类型，加载批注
    if (shareLink.type === ShareLinkType.VIDEO_REVIEW && shareLink.video_id) {
      const annotations = await this.annotationRepository.find({
        where: { video_id: shareLink.video_id },
        relations: ['user'],
        order: { created_at: 'ASC' },
      });
      (shareLink as any).annotations = annotations;
    }

    return shareLink;
  }

  async verifyPassword(token: string, password: string): Promise<boolean> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
    });

    if (!shareLink || !shareLink.password_hash) {
      return false;
    }

    return bcrypt.compare(password, shareLink.password_hash);
  }

  async update(id: string, data: any): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({ where: { id } });
    if (shareLink) {
      Object.assign(shareLink, data);
      return this.shareLinkRepository.save(shareLink);
    }
    return shareLink;
  }

  async toggle(id: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({ where: { id } });
    if (shareLink) {
      shareLink.is_active = !shareLink.is_active;
      return this.shareLinkRepository.save(shareLink);
    }
    return shareLink;
  }

  // 通过分享token获取批注（公开接口）
  async getAnnotationsByShareToken(token: string): Promise<Annotation[]> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
    });

    if (!shareLink || !shareLink.video_id) {
      return [];
    }

    // 检查是否过期
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return [];
    }

    // 只允许审阅类型的分享链接访问批注
    if (shareLink.type !== ShareLinkType.VIDEO_REVIEW) {
      return [];
    }

    return this.annotationRepository.find({
      where: { video_id: shareLink.video_id },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  // 通过分享token创建批注（公开接口）
  async createAnnotationByShareToken(
    token: string,
    data: { timecode: string; content: string; clientName?: string },
  ): Promise<Annotation> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
    });

    if (!shareLink || !shareLink.video_id) {
      throw new Error('分享链接不存在或已失效');
    }

    // 检查是否过期
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new Error('分享链接已过期');
    }

    // 只允许审阅类型的分享链接创建批注
    if (shareLink.type !== ShareLinkType.VIDEO_REVIEW) {
      throw new Error('此分享链接不支持批注功能');
    }

    const annotation = this.annotationRepository.create({
      video_id: shareLink.video_id,
      user_id: null, // 分享链接创建的批注没有用户ID
      timecode: data.timecode,
      content: data.content,
    });

    return this.annotationRepository.save(annotation);
  }
}

