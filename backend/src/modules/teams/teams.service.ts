import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember, TeamRole, MemberStatus } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 生成唯一的团队编码
   */
  private generateTeamCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 检查团队编码是否唯一
   */
  private async isCodeUnique(code: string): Promise<boolean> {
    const existing = await this.teamRepository.findOne({ where: { code } });
    return !existing;
  }

  /**
   * 创建团队
   */
  async create(createTeamDto: CreateTeamDto, userId: string): Promise<Team> {
    // 生成唯一的团队编码
    let code: string;
    let attempts = 0;
    do {
      code = this.generateTeamCode();
      attempts++;
      if (attempts > 10) {
        throw new BadRequestException('无法生成唯一的团队编码，请重试');
      }
    } while (!(await this.isCodeUnique(code)));

    const team = this.teamRepository.create({
      ...createTeamDto,
      code,
      created_by: userId,
    });

    const savedTeam = await this.teamRepository.save(team);

    // 将创建者添加为超级管理员
    await this.teamMemberRepository.save({
      team_id: savedTeam.id,
      user_id: userId,
      role: TeamRole.SUPER_ADMIN,
      status: MemberStatus.ACTIVE,
      joined_at: new Date(),
    });

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: savedTeam.id,
      user_id: userId,
      action: 'create',
      resource_type: 'team',
      resource_id: savedTeam.id,
      new_value: { name: savedTeam.name, code: savedTeam.code },
    });

    return savedTeam;
  }

  /**
   * 查找所有团队（用户所属的团队）
   */
  async findAll(userId: string): Promise<Team[]> {
    const members = await this.teamMemberRepository.find({
      where: { user_id: userId, status: MemberStatus.ACTIVE },
      relations: ['team'],
    });

    return members.map((member) => member.team);
  }

  /**
   * 根据ID查找团队
   */
  async findOne(id: string, userId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['creator', 'members', 'members.user'],
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 检查用户是否有权限访问
    const member = await this.teamMemberRepository.findOne({
      where: { team_id: id, user_id: userId, status: MemberStatus.ACTIVE },
    });

    if (!member) {
      throw new ForbiddenException('无权访问此团队');
    }

    return team;
  }

  /**
   * 根据编码查找团队
   */
  async findByCode(code: string): Promise<Team | null> {
    return this.teamRepository.findOne({
      where: { code },
      relations: ['creator'],
    });
  }

  /**
   * 更新团队信息
   */
  async update(id: string, updateTeamDto: UpdateTeamDto, userId: string): Promise<Team> {
    const team = await this.findOne(id, userId);

    // 检查权限（只有超级管理员可以修改）
    const member = await this.teamMemberRepository.findOne({
      where: { team_id: id, user_id: userId },
    });

    if (member?.role !== TeamRole.SUPER_ADMIN) {
      throw new ForbiddenException('只有超级管理员可以修改团队信息');
    }

    const oldValue = { name: team.name, description: team.description };

    Object.assign(team, updateTeamDto);
    const updated = await this.teamRepository.save(team);

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: id,
      user_id: userId,
      action: 'update',
      resource_type: 'team',
      resource_id: id,
      old_value: oldValue,
      new_value: { name: updated.name, description: updated.description },
    });

    return updated;
  }

  /**
   * 删除团队
   */
  async remove(id: string, userId: string): Promise<void> {
    const team = await this.findOne(id, userId);

    // 检查权限（只有超级管理员可以删除）
    const member = await this.teamMemberRepository.findOne({
      where: { team_id: id, user_id: userId },
    });

    if (member?.role !== TeamRole.SUPER_ADMIN) {
      throw new ForbiddenException('只有超级管理员可以删除团队');
    }

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: id,
      user_id: userId,
      action: 'delete',
      resource_type: 'team',
      resource_id: id,
      old_value: { name: team.name, code: team.code },
    });

    await this.teamRepository.remove(team);
  }

  /**
   * 添加团队成员
   */
  async addMember(teamId: string, addMemberDto: AddTeamMemberDto, userId: string): Promise<TeamMember> {
    const team = await this.findOne(teamId, userId);

    // 检查权限（管理员和超级管理员可以添加成员）
    const member = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!member || (member.role !== TeamRole.SUPER_ADMIN && member.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('无权添加团队成员');
    }

    // 检查用户是否已经是成员
    const existing = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: addMemberDto.user_id },
    });

    if (existing) {
      throw new BadRequestException('用户已经是团队成员');
    }

    const teamMember = this.teamMemberRepository.create({
      team_id: teamId,
      user_id: addMemberDto.user_id,
      role: addMemberDto.role || TeamRole.MEMBER,
      status: MemberStatus.ACTIVE,
      invited_by: userId,
      joined_at: new Date(),
    });

    const saved = await this.teamMemberRepository.save(teamMember);

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: teamId,
      user_id: userId,
      action: 'create',
      resource_type: 'team_member',
      resource_id: saved.id,
      new_value: { user_id: addMemberDto.user_id, role: saved.role },
    });

    return saved;
  }

  /**
   * 更新团队成员
   */
  async updateMember(
    teamId: string,
    memberId: string,
    updateMemberDto: UpdateTeamMemberDto,
    userId: string,
  ): Promise<TeamMember> {
    await this.findOne(teamId, userId);

    // 检查权限
    const currentMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!currentMember || (currentMember.role !== TeamRole.SUPER_ADMIN && currentMember.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('无权修改团队成员');
    }

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('团队成员不存在');
    }

    // 不能修改自己的角色（超级管理员除外）
    if (member.user_id === userId && currentMember.role !== TeamRole.SUPER_ADMIN) {
      throw new ForbiddenException('不能修改自己的角色');
    }

    // 不能将最后一个超级管理员降级
    if (updateMemberDto.role && updateMemberDto.role !== TeamRole.SUPER_ADMIN && member.role === TeamRole.SUPER_ADMIN) {
      const superAdmins = await this.teamMemberRepository.count({
        where: { team_id: teamId, role: TeamRole.SUPER_ADMIN, status: MemberStatus.ACTIVE },
      });

      if (superAdmins <= 1) {
        throw new BadRequestException('不能将最后一个超级管理员降级');
      }
    }

    const oldValue = { role: member.role, status: member.status };

    Object.assign(member, updateMemberDto);
    const updated = await this.teamMemberRepository.save(member);

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: teamId,
      user_id: userId,
      action: 'update',
      resource_type: 'team_member',
      resource_id: memberId,
      old_value: oldValue,
      new_value: { role: updated.role, status: updated.status },
    });

    return updated;
  }

  /**
   * 移除团队成员
   */
  async removeMember(teamId: string, memberId: string, userId: string): Promise<void> {
    await this.findOne(teamId, userId);

    // 检查权限
    const currentMember = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId },
    });

    if (!currentMember || (currentMember.role !== TeamRole.SUPER_ADMIN && currentMember.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('无权移除团队成员');
    }

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, team_id: teamId },
    });

    if (!member) {
      throw new NotFoundException('团队成员不存在');
    }

    // 不能移除自己（超级管理员除外）
    if (member.user_id === userId && currentMember.role !== TeamRole.SUPER_ADMIN) {
      throw new ForbiddenException('不能移除自己');
    }

    // 不能移除最后一个超级管理员
    if (member.role === TeamRole.SUPER_ADMIN) {
      const superAdmins = await this.teamMemberRepository.count({
        where: { team_id: teamId, role: TeamRole.SUPER_ADMIN, status: MemberStatus.ACTIVE },
      });

      if (superAdmins <= 1) {
        throw new BadRequestException('不能移除最后一个超级管理员');
      }
    }

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: teamId,
      user_id: userId,
      action: 'delete',
      resource_type: 'team_member',
      resource_id: memberId,
      old_value: { user_id: member.user_id, role: member.role },
    });

    await this.teamMemberRepository.remove(member);
  }

  /**
   * 通过编码加入团队
   */
  async joinByCode(joinTeamDto: JoinTeamDto, userId: string): Promise<TeamMember> {
    const team = await this.findByCode(joinTeamDto.code);

    if (!team) {
      throw new NotFoundException('团队编码不存在');
    }

    // 检查用户是否已经是成员
    const existing = await this.teamMemberRepository.findOne({
      where: { team_id: team.id, user_id: userId },
    });

    if (existing) {
      if (existing.status === MemberStatus.ACTIVE) {
        throw new BadRequestException('您已经是该团队的成员');
      }
      // 如果是待审批或已移除状态，更新为活跃状态
      existing.status = MemberStatus.ACTIVE;
      existing.joined_at = new Date();
      return this.teamMemberRepository.save(existing);
    }

    const teamMember = this.teamMemberRepository.create({
      team_id: team.id,
      user_id: userId,
      role: TeamRole.MEMBER,
      status: MemberStatus.ACTIVE, // 直接加入，无需审批
      joined_at: new Date(),
    });

    // 记录审计日志
    await this.auditLogRepository.save({
      team_id: team.id,
      user_id: userId,
      action: 'create',
      resource_type: 'team_member',
      resource_id: teamMember.id,
      new_value: { team_id: team.id, role: TeamRole.MEMBER, status: MemberStatus.ACTIVE },
    });

    return this.teamMemberRepository.save(teamMember);
  }

  /**
   * 获取团队成员列表
   */
  async getMembers(teamId: string, userId: string): Promise<TeamMember[]> {
    await this.findOne(teamId, userId);

    return this.teamMemberRepository.find({
      where: { team_id: teamId },
      relations: ['user', 'inviter'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 获取用户在团队中的角色
   */
  async getUserRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const member = await this.teamMemberRepository.findOne({
      where: { team_id: teamId, user_id: userId, status: MemberStatus.ACTIVE },
    });

    return member?.role || null;
  }
}

