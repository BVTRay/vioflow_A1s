import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/entities/team-member.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  /**
   * 创建审计日志（内部使用）
   */
  async create(createAuditLogDto: CreateAuditLogDto, userId: string): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...createAuditLogDto,
      user_id: userId,
    });

    return this.auditLogRepository.save(auditLog);
  }

  /**
   * 获取团队的审计日志
   */
  async findByTeam(
    teamId: string,
    userId: string,
    filters?: {
      action?: string;
      resource_type?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: AuditLog[]; total: number }> {
    // 检查权限（只有管理员和超级管理员可以查看审计日志）
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权查看审计日志');
    }

    const query = this.auditLogRepository.createQueryBuilder('audit')
      .where('audit.team_id = :teamId', { teamId })
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.created_at', 'DESC');

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.resource_type) {
      query.andWhere('audit.resource_type = :resourceType', { resourceType: filters.resource_type });
    }

    if (filters?.startDate) {
      query.andWhere('audit.created_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('audit.created_at <= :endDate', { endDate: filters.endDate });
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
   * 根据资源查询审计日志
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    teamId: string,
    userId: string,
  ): Promise<AuditLog[]> {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权查看审计日志');
    }

    return this.auditLogRepository.find({
      where: {
        team_id: teamId,
        resource_type: resourceType,
        resource_id: resourceId,
      },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }
}

