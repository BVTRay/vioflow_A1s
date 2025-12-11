import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { ShareLink, ShareLinkType } from './entities/share-link.entity';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
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
}

