import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { ShareLink, ShareLinkType } from './entities/share-link.entity';
import { ShareLinkAccessLog, AccessAction } from './entities/share-link-access-log.entity';
import { Annotation } from '../annotations/entities/annotation.entity';
import { Video, VideoStatus } from '../videos/entities/video.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
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
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async findAll(
    userId: string,
    teamId?: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: ShareLink[]; total: number; page: number; limit: number }> {
    const query = this.shareLinkRepository.createQueryBuilder('share')
      .leftJoinAndSelect('share.video', 'video')
      .leftJoinAndSelect('share.project', 'project')
      .leftJoinAndSelect('share.delivery_package', 'delivery_package')
      .leftJoinAndSelect('share.showcase_package', 'showcase_package');

    if (teamId) {
      // 如果指定了团队，查询该团队的所有分享链接
      query.leftJoin('project.team', 'team')
        .orWhere('team.id = :teamId', { teamId })
        .orWhere('share.created_by IN (SELECT user_id FROM team_members WHERE team_id = :teamId)', { teamId });
    } else {
      // 否则只查询用户创建的
      query.where('share.created_by = :userId', { userId });
    }

    // 获取总数
    const total = await query.getCount();

    // 分页
    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;
    
    query.skip(skip).take(limitNum);
    query.orderBy('share.created_at', 'DESC');

    const results = await query.getMany();
    
    return {
      data: results,
      total,
      page: pageNum,
      limit: limitNum,
    };
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
    // 支持完整 token 或短链接（token 前8位）
    let shareLink: ShareLink | null = null;
    
    // 首先尝试精确匹配
    shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
      relations: ['video', 'project'],
    });

    // 如果没找到且 token 长度为8（短链接），则模糊匹配
    if (!shareLink && token.length === 8) {
      const query = this.shareLinkRepository.createQueryBuilder('share')
        .leftJoinAndSelect('share.video', 'video')
        .leftJoinAndSelect('share.project', 'project')
        .where('share.token LIKE :prefix', { prefix: `${token}%` })
        .andWhere('share.is_active = :active', { active: true })
        .orderBy('share.created_at', 'DESC')
        .limit(1);
      
      shareLink = await query.getOne();
    }

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
    // 支持完整 token 或短链接
    let shareLink: ShareLink | null = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
    });

    // 如果没找到且 token 长度为8（短链接），则模糊匹配
    if (!shareLink && token.length === 8) {
      const query = this.shareLinkRepository.createQueryBuilder('share')
        .where('share.token LIKE :prefix', { prefix: `${token}%` })
        .andWhere('share.is_active = :active', { active: true })
        .orderBy('share.created_at', 'DESC')
        .limit(1);
      
      shareLink = await query.getOne();
    }

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

  // 辅助方法：通过 token 或短链接查找分享链接
  private async findShareLinkByTokenOrShortCode(token: string): Promise<ShareLink | null> {
    // 首先尝试精确匹配
    let shareLink = await this.shareLinkRepository.findOne({
      where: { token, is_active: true },
    });

    // 如果没找到且 token 长度为8（短链接），则模糊匹配
    if (!shareLink && token.length === 8) {
      const query = this.shareLinkRepository.createQueryBuilder('share')
        .where('share.token LIKE :prefix', { prefix: `${token}%` })
        .andWhere('share.is_active = :active', { active: true })
        .orderBy('share.created_at', 'DESC')
        .limit(1);
      
      shareLink = await query.getOne();
    }

    return shareLink;
  }

  // 通过分享token获取批注（公开接口）
  async getAnnotationsByShareToken(token: string): Promise<Annotation[]> {
    const shareLink = await this.findShareLinkByTokenOrShortCode(token);

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

    const annotations = await this.annotationRepository.find({
      where: { video_id: shareLink.video_id },
      relations: ['user', 'user.team'],
      order: { created_at: 'ASC' },
    });

    // 为每个批注添加用户类型和团队信息
    return annotations.map(annotation => {
      const result: any = { ...annotation };
      
      if (annotation.user_id && annotation.user) {
        // 登录用户
        if (annotation.user.team_id && annotation.user.team) {
          // 团队用户
          result.userType = 'team_user';
          result.teamName = annotation.user.team.name;
        } else {
          // 个人用户
          result.userType = 'personal_user';
          result.teamName = null;
        }
      } else if (annotation.client_name) {
        // 访客
        result.userType = 'guest';
        result.teamName = null;
      } else {
        // 未知类型
        result.userType = 'guest';
        result.teamName = null;
      }
      
      return result;
    });
  }

  // 通过分享token创建批注（公开接口，支持登录用户）
  async createAnnotationByShareToken(
    token: string,
    data: { timecode: string; content: string; clientName?: string },
    userId?: string | null,
  ): Promise<Annotation> {
    const shareLink = await this.findShareLinkByTokenOrShortCode(token);

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

    // 如果有登录用户，使用 user_id；否则使用 client_name
    const annotation = this.annotationRepository.create({
      video_id: shareLink.video_id,
      user_id: userId || null, // 登录用户使用 user_id
      timecode: data.timecode,
      content: data.content,
      client_name: userId ? null : (data.clientName || null), // 登录用户不需要 client_name
    });

    const savedAnnotation = await this.annotationRepository.save(annotation);

    // 更新视频状态为已批注
    const video = await this.videoRepository.findOne({
      where: { id: shareLink.video_id },
    });

    if (video) {
      // 更新批注计数
      const annotationCount = await this.annotationRepository.count({
        where: { video_id: video.id },
      });
      
      video.annotation_count = annotationCount;
      
      // 如果视频状态是初始状态，更新为已批注
      if (video.status === VideoStatus.INITIAL) {
        video.status = VideoStatus.ANNOTATED;
      }
      
      await this.videoRepository.save(video);

      // 发送通知给分享链接创建者
      if (shareLink.created_by) {
        // 获取批注者名称：优先使用登录用户名，其次是访客名称
        let annotatorName = '访客';
        if (userId) {
          // 如果是登录用户，获取用户名称
          const user = await this.annotationRepository.manager.findOne('User', { where: { id: userId } });
          annotatorName = (user as any)?.name || '已登录用户';
        } else if (data.clientName) {
          annotatorName = data.clientName;
        }
        
        const notification = this.notificationRepository.create({
          user_id: shareLink.created_by,
          type: NotificationType.INFO,
          title: '收到新的视频批注',
          message: `${annotatorName} 在视频「${video.name}」的 ${data.timecode} 处添加了批注：${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`,
          related_type: 'annotation',
          related_id: savedAnnotation.id,
        });
        await this.notificationRepository.save(notification);
      }
    }

    return savedAnnotation;
  }

  /**
   * 通过分享token导出批注PDF（公开接口）
   */
  async exportPdfByShareToken(token: string): Promise<{ url: string; filename: string }> {
    const shareLink = await this.findShareLinkByTokenOrShortCode(token);

    if (!shareLink || !shareLink.video_id) {
      throw new Error('分享链接不存在或已失效');
    }

    // 检查是否过期
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      throw new Error('分享链接已过期');
    }

    // 只允许审阅类型的分享链接导出
    if (shareLink.type !== ShareLinkType.VIDEO_REVIEW) {
      throw new Error('此分享链接不支持导出功能');
    }

    // 获取视频信息
    const video = await this.videoRepository.findOne({
      where: { id: shareLink.video_id },
      relations: ['project'],
    });

    if (!video) {
      throw new Error('视频不存在');
    }

    // 获取批注列表
    const annotations = await this.getAnnotationsByShareToken(token);

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `审阅报告_${video.name}_${timestamp}.pdf`;
    const filepath = path.join(exportDir, filename);

    // 创建 PDF 文档
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `审阅报告 - ${video.name}`,
        Author: 'Vioflow',
        Subject: '视频批注审阅报告',
      },
    });

    // 写入文件
    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    // 标题页
    doc.fontSize(24).text('Video Review Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text('视频审阅报告', { align: 'center' });
    doc.moveDown(2);

    // 视频信息
    doc.fontSize(14).text(`Video: ${video.name}`, { align: 'left' });
    doc.fontSize(12).text(`Project: ${video.project?.name || 'Unknown'}`, { align: 'left' });
    doc.text(`Version: v${video.version}`, { align: 'left' });
    doc.text(`Generated: ${new Date().toLocaleString('zh-CN')}`, { align: 'left' });
    doc.text(`Annotations: ${annotations.length}`, { align: 'left' });
    doc.moveDown(2);

    // 分隔线
    doc.strokeColor('#cccccc').lineWidth(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(2);

    // 批注列表
    doc.fontSize(16).text('Annotation Details', { underline: true });
    doc.moveDown(1);

    if (annotations.length === 0) {
      doc.fontSize(12).fillColor('#888888').text('No annotations', { align: 'center' });
    } else {
      annotations.forEach((annotation, index) => {
        // 检查是否需要新页
        if (doc.y > 700) {
          doc.addPage();
        }

        // 批注序号和时间码
        doc.fillColor('#333333').fontSize(12).text(`#${index + 1}`, { continued: true });
        doc.fillColor('#6366f1').text(`  [${annotation.timecode}]`);

        // 批注者信息
        const authorName = annotation.user?.name || annotation.client_name || 'Guest';
        const isGuest = !annotation.user?.name;
        doc.fillColor('#666666').fontSize(10).text(
          `${authorName}${isGuest ? ' (Guest)' : ''} - ${new Date(annotation.created_at).toLocaleString('zh-CN')}`
        );

        // 批注内容
        doc.fillColor('#000000').fontSize(11).text(annotation.content, {
          indent: 20,
          lineGap: 4,
        });

        // 状态标记
        if (annotation.is_completed) {
          doc.fillColor('#10b981').fontSize(9).text('[Resolved]', { indent: 20 });
        }

        doc.moveDown(1.5);
      });
    }

    // 页脚
    doc.fontSize(8).fillColor('#999999');
    doc.text('Generated by Vioflow Video Management System', 50, 780, { align: 'center' });

    // 完成文档
    doc.end();

    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // 返回下载URL
    const downloadUrl = `/api/shares/download/${encodeURIComponent(filename)}`;

    return {
      url: downloadUrl,
      filename: filename,
    };
  }

  /**
   * 获取导出文件
   */
  async getExportFile(filename: string): Promise<{ filepath: string; exists: boolean }> {
    const filepath = path.join(process.cwd(), 'uploads', 'exports', filename);
    return {
      filepath,
      exists: fs.existsSync(filepath),
    };
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

