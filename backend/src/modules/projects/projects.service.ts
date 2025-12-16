import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectMember, MemberRole } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TeamsService } from '../teams/teams.service';
import { VideosService } from '../videos/videos.service';
import { TeamRole } from '../teams/entities/team-member.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    private videosService: VideosService,
  ) {}

  /**
   * 检查用户是否有权限操作项目
   */
  private async checkProjectPermission(
    projectId: string,
    userId: string,
    requiredTeamRole?: TeamRole[],
    requiredProjectRole?: MemberRole[],
  ): Promise<{ project: Project; teamRole: TeamRole | null; projectRole: MemberRole | null }> {
    const project = await this.findOne(projectId);

    if (!project.team_id) {
      throw new NotFoundException('项目未关联团队');
    }

    // 检查团队权限
    const teamRole = await this.teamsService.getUserRole(project.team_id, userId);
    if (!teamRole) {
      throw new ForbiddenException('您不是该团队的成员');
    }

    // 检查团队级别权限
    if (requiredTeamRole && !requiredTeamRole.includes(teamRole)) {
      throw new ForbiddenException('无权执行此操作');
    }

    // 检查项目级别权限
    let projectRole: MemberRole | null = null;
    if (requiredProjectRole) {
      const member = await this.memberRepository.findOne({
        where: { project_id: projectId, user_id: userId },
      });
      projectRole = member?.role || null;

      // 如果是团队管理员，可以操作所有项目
      if (teamRole === TeamRole.ADMIN || teamRole === TeamRole.SUPER_ADMIN) {
        projectRole = MemberRole.OWNER; // 管理员视为项目所有者
      } else if (!projectRole || !requiredProjectRole.includes(projectRole)) {
        throw new ForbiddenException('无权操作此项目');
      }
    }

    return { project, teamRole, projectRole };
  }

  async create(createProjectDto: CreateProjectDto, userId: string, teamId?: string): Promise<Project> {
    const finalTeamId = teamId || createProjectDto.teamId;
    
    // 检查团队权限
    if (finalTeamId) {
      const teamRole = await this.teamsService.getUserRole(finalTeamId, userId);
      if (!teamRole) {
        throw new ForbiddenException('您不是该团队的成员');
      }
    }

    const project = this.projectRepository.create({
      ...createProjectDto,
      team_id: finalTeamId,
      created_date: new Date(),
      last_activity_at: new Date(),
      last_opened_at: new Date(),
    });
    const savedProject = await this.projectRepository.save(project);

    // 添加创建者为owner
    const owner = this.memberRepository.create({
      project_id: savedProject.id,
      user_id: userId,
      role: MemberRole.OWNER,
    });
    await this.memberRepository.save(owner);

    // 记录审计日志
    if (finalTeamId) {
      await this.auditLogRepository.save({
        team_id: finalTeamId,
        user_id: userId,
        action: 'create',
        resource_type: 'project',
        resource_id: savedProject.id,
        new_value: { name: savedProject.name, client: savedProject.client },
      });
    }

    return savedProject;
  }

  async findAll(filters?: {
    status?: ProjectStatus;
    group?: string;
    month?: string;
    teamId?: string;
    groupId?: string;
  }): Promise<Project[]> {
    const query = this.projectRepository.createQueryBuilder('project');

    // 强制要求 teamId（多租户模式）
    if (filters?.teamId) {
      query.andWhere('project.team_id = :teamId', { teamId: filters.teamId });
      console.log(`[ProjectsService] 查询项目，团队 ID: ${filters.teamId}`);
    } else {
      // 如果没有提供 teamId，返回空数组（多租户模式下必须提供 teamId）
      console.log('[ProjectsService] ⚠️ 没有提供 teamId，返回空数组');
      return [];
    }

    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.groupId) {
      query.andWhere('project.group_id = :groupId', { groupId: filters.groupId });
    } else if (filters?.group) {
      query.andWhere('project.group = :group', { group: filters.group });
    }

    if (filters?.month) {
      query.andWhere('project.created_date::text LIKE :month', {
        month: `${filters.month}%`,
      });
    }

    const results = await query.getMany();
    console.log(`[ProjectsService] 找到 ${results.length} 个项目`);
    return results;
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['members', 'videos', 'delivery'],
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string): Promise<Project> {
    const { project, teamRole, projectRole: userProjectRole } = await this.checkProjectPermission(
      id,
      userId,
      undefined, // 任何团队成员都可以更新
      [MemberRole.OWNER, MemberRole.MEMBER], // 项目 owner 或 member 可以更新
    );

    const oldValue = {
      name: project.name,
      client: project.client,
      lead: project.lead,
      post_lead: project.post_lead,
      group: project.group,
      status: project.status,
    };

    Object.assign(project, updateProjectDto);
    const updated = await this.projectRepository.save(project);

    // 记录审计日志
    if (project.team_id) {
      await this.auditLogRepository.save({
        team_id: project.team_id,
        user_id: userId,
        action: 'update',
        resource_type: 'project',
        resource_id: id,
        old_value: oldValue,
        new_value: {
          name: updated.name,
          client: updated.client,
          lead: updated.lead,
          post_lead: updated.post_lead,
          group: updated.group,
          status: updated.status,
        },
      });
    }

    return updated;
  }

  async finalize(id: string, userId: string): Promise<Project> {
    const { project } = await this.checkProjectPermission(
      id,
      userId,
      undefined, // 任何团队成员都可以完成项目
      [MemberRole.OWNER, MemberRole.MEMBER], // 项目 owner 或 member 可以完成
    );

    const oldStatus = project.status;
    project.status = ProjectStatus.FINALIZED;
    project.finalized_at = new Date();
    const updated = await this.projectRepository.save(project);

    // 记录审计日志
    if (project.team_id) {
      await this.auditLogRepository.save({
        team_id: project.team_id,
        user_id: userId,
        action: 'update',
        resource_type: 'project',
        resource_id: id,
        old_value: { status: oldStatus },
        new_value: { status: ProjectStatus.FINALIZED, finalized_at: updated.finalized_at },
      });
    }

    return updated;
  }

  async updateLastOpened(id: string): Promise<void> {
    await this.projectRepository.update(id, {
      last_opened_at: new Date(),
    });
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.projectRepository.update(id, {
      last_activity_at: new Date(),
    });
  }

  async getActiveProjects(limit: number = 10, teamId?: string): Promise<Project[]> {
    const query = this.projectRepository
      .createQueryBuilder('project')
      .where('project.last_activity_at IS NOT NULL');
    
    if (teamId) {
      query.andWhere('project.team_id = :teamId', { teamId });
    }
    
    return query
      .orderBy('project.last_activity_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getRecentOpened(limit: number = 10, teamId?: string): Promise<Project[]> {
    const query = this.projectRepository
      .createQueryBuilder('project')
      .where('project.last_opened_at IS NOT NULL');
    
    if (teamId) {
      query.andWhere('project.team_id = :teamId', { teamId });
    }
    
    return query
      .orderBy('project.last_opened_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async unlock(id: string, justification: string): Promise<Project> {
    const project = await this.findOne(id);
    // 记录解锁理由（可以存储到日志表）
    return project;
  }

  /**
   * 删除项目
   */
  async remove(id: string, userId: string): Promise<void> {
    const { project } = await this.checkProjectPermission(
      id,
      userId,
      [TeamRole.SUPER_ADMIN, TeamRole.ADMIN], // 只有管理员可以删除项目
    );

    // 删除该项目下的所有视频及其存储文件
    await this.videosService.deleteByProject(id);

    // 记录审计日志
    if (project.team_id) {
      await this.auditLogRepository.save({
        team_id: project.team_id,
        user_id: userId,
        action: 'delete',
        resource_type: 'project',
        resource_id: id,
        old_value: { name: project.name, client: project.client },
      });
    }

    await this.projectRepository.remove(project);
  }

  async getMembers(projectId: string, userId: string): Promise<ProjectMember[]> {
    // 检查用户是否有权限查看项目成员（必须是团队成员）
    await this.checkProjectPermission(projectId, userId);

    return this.memberRepository.find({
      where: { project_id: projectId },
      relations: ['user'],
    });
  }

  async addMember(projectId: string, targetUserId: string, role: string = MemberRole.MEMBER, userId: string): Promise<ProjectMember> {
    // 检查权限：只有项目 owner 或团队 admin 可以添加成员
    const { project } = await this.checkProjectPermission(
      projectId,
      userId,
      undefined,
      [MemberRole.OWNER], // 项目 owner 或团队 admin（在 checkProjectPermission 中已处理）
    );

    // 检查目标用户是否已经是成员
    const existing = await this.memberRepository.findOne({
      where: { project_id: projectId, user_id: targetUserId },
    });

    if (existing) {
      throw new ForbiddenException('用户已经是项目成员');
    }

    const member = this.memberRepository.create({
      project_id: projectId,
      user_id: targetUserId,
      role: (role as MemberRole) || MemberRole.MEMBER,
    });
    const saved = await this.memberRepository.save(member);

    // 记录审计日志
    if (project.team_id) {
      await this.auditLogRepository.save({
        team_id: project.team_id,
        user_id: userId,
        action: 'create',
        resource_type: 'project_member',
        resource_id: saved.id,
        new_value: { user_id: targetUserId, role: saved.role },
      });
    }

    return saved;
  }

  /**
   * 移除项目成员
   */
  async removeMember(projectId: string, memberId: string, userId: string): Promise<void> {
    // 检查权限：只有项目 owner 或团队 admin 可以移除成员
    const { project } = await this.checkProjectPermission(
      projectId,
      userId,
      undefined,
      [MemberRole.OWNER],
    );

    const member = await this.memberRepository.findOne({
      where: { id: memberId, project_id: projectId },
    });

    if (!member) {
      throw new NotFoundException('项目成员不存在');
    }

    // 不能移除项目 owner
    if (member.role === MemberRole.OWNER) {
      throw new ForbiddenException('不能移除项目所有者');
    }

    // 记录审计日志
    if (project.team_id) {
      await this.auditLogRepository.save({
        team_id: project.team_id,
        user_id: userId,
        action: 'delete',
        resource_type: 'project_member',
        resource_id: memberId,
        old_value: { user_id: member.user_id, role: member.role },
      });
    }

    await this.memberRepository.remove(member);
  }
}

