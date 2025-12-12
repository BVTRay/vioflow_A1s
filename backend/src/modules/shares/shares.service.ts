import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { ShareLink, ShareLinkType } from './entities/share-link.entity';
import { ShareLinkAccessLog, AccessAction } from './entities/share-link-access-log.entity';
import { Annotation } from '../annotations/entities/annotation.entity';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/entities/team-member.entity';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(ShareLink)
    private shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(ShareLinkAccessLog)
    private accessLogRepository: Repository<ShareLinkAccessLog>,
    @InjectRepository(Annotation)
    private annotationRepository: Repository<Annotation>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async findAll(userId: string, teamId?: string): Promise<ShareLink[]> {
    const query = this.shareLinkRepository.createQueryBuilder('share')
      .leftJoinAndSelect('share.video', 'video')
      .leftJoinAndSelect('share.project', 'project')
      .leftJoinAndSelect('share.delivery_package', 'delivery_package')
      .leftJoinAndSelect('share.showcase_package', 'showcase_package')
      .orderBy('share.created_at', 'DESC');

    if (teamId) {
      // 如果指定了团队，查询该团队的所有分享链接
      query.leftJoin('project.team', 'team')
        .orWhere('team.id = :teamId', { teamId })
        .orWhere('share.created_by IN (SELECT user_id FROM team_members WHERE team_id = :teamId)', { teamId });
    } else {
      // 否则只查询用户创建的
      query.where('share.created_by = :userId', { userId });
    }

    return query.getMany();
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

  /**
   * 记录访问日志
   */
  async logAccess(
    shareLinkId: string,
    action: AccessAction,
    data?: {
      viewerIp?: string;
      viewerUserAgent?: string;
      viewerEmail?: string;
      viewerName?: string;
      resourceType?: string;
      resourceId?: string;
      fileName?: string;
      fileSize?: number;
    },
  ): Promise<ShareLinkAccessLog> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { id: shareLinkId },
    });

    if (!shareLink) {
      throw new NotFoundException('分享链接不存在');
    }

    const accessLog = this.accessLogRepository.create({
      share_link_id: shareLinkId,
      action,
      viewer_ip: data?.viewerIp,
      viewer_user_agent: data?.viewerUserAgent,
      viewer_email: data?.viewerEmail,
      viewer_name: data?.viewerName,
      resource_type: data?.resourceType,
      resource_id: data?.resourceId,
      file_name: data?.fileName,
      file_size: data?.fileSize,
    });

    const saved = await this.accessLogRepository.save(accessLog);

    // 更新分享链接的统计信息（触发器会自动更新，这里也可以手动更新）
    if (action === AccessAction.VIEW) {
      shareLink.view_count = (shareLink.view_count || 0) + 1;
      shareLink.last_accessed_at = new Date();
    } else if (action === AccessAction.DOWNLOAD) {
      shareLink.download_count = (shareLink.download_count || 0) + 1;
      shareLink.last_accessed_at = new Date();
    }
    await this.shareLinkRepository.save(shareLink);

    return saved;
  }

  /**
   * 获取分享链接的访问记录
   */
  async getAccessLogs(
    shareLinkId: string,
    teamId: string,
    userId: string,
    filters?: {
      action?: AccessAction;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: ShareLinkAccessLog[]; total: number }> {
    // 检查权限（只有管理员和超级管理员可以查看访问记录）
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权查看访问记录');
    }

    const shareLink = await this.shareLinkRepository.findOne({
      where: { id: shareLinkId },
    });

    if (!shareLink) {
      throw new NotFoundException('分享链接不存在');
    }

    const query = this.accessLogRepository.createQueryBuilder('log')
      .where('log.share_link_id = :shareLinkId', { shareLinkId })
      .orderBy('log.created_at', 'DESC');

    if (filters?.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }

    if (filters?.startDate) {
      query.andWhere('log.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('log.created_at <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();

    if (filters?.page && filters?.limit) {
      const skip = (filters.page - 1) * filters.limit;
      query.skip(skip).take(filters.limit);
    }

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * 获取分享链接统计
   */
  async getStats(shareLinkId: string, teamId: string, userId: string) {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权查看统计信息');
    }

    const shareLink = await this.shareLinkRepository.findOne({
      where: { id: shareLinkId },
    });

    if (!shareLink) {
      throw new NotFoundException('分享链接不存在');
    }

    const recentAccess = await this.accessLogRepository.find({
      where: { share_link_id: shareLinkId },
      order: { created_at: 'DESC' },
      take: 10,
    });

    return {
      viewCount: shareLink.view_count || 0,
      downloadCount: shareLink.download_count || 0,
      lastAccessedAt: shareLink.last_accessed_at,
      recentAccess,
    };
  }

  /**
   * 更新分享链接权限
   */
  async updatePermissions(
    shareLinkId: string,
    teamId: string,
    userId: string,
    permissions: {
      allowView?: boolean;
      allowDownload?: boolean;
      isActive?: boolean;
    },
  ): Promise<ShareLink> {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权修改分享链接权限');
    }

    const shareLink = await this.shareLinkRepository.findOne({
      where: { id: shareLinkId },
    });

    if (!shareLink) {
      throw new NotFoundException('分享链接不存在');
    }

    if (permissions.allowView !== undefined) {
      shareLink.allow_view = permissions.allowView;
    }
    if (permissions.allowDownload !== undefined) {
      shareLink.allow_download = permissions.allowDownload;
    }
    if (permissions.isActive !== undefined) {
      shareLink.is_active = permissions.isActive;
    }

    return this.shareLinkRepository.save(shareLink);
  }

  /**
   * 批量生成分享链接
   */
  async batchCreate(
    videoIds: string[],
    userId: string,
    options: {
      allowDownload?: boolean;
      hasPassword?: boolean;
      password?: string;
      expiresAt?: string;
      justification?: string;
    },
  ): Promise<{ success: ShareLink[]; failed: number }> {
    const success: ShareLink[] = [];
    let failed = 0;

    for (const videoId of videoIds) {
      try {
        const shareLink = await this.createShareLink({
          type: ShareLinkType.VIDEO_SHARE,
          videoId,
          createdBy: userId,
          allowDownload: options.allowDownload || false,
          hasPassword: options.hasPassword || false,
          password: options.password,
          expiresAt: options.expiresAt,
          justification: options.justification,
        });
        success.push(shareLink);
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}

