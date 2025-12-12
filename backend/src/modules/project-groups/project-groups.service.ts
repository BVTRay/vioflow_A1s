import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectGroup } from './entities/project-group.entity';
import { CreateProjectGroupDto } from './dto/create-project-group.dto';
import { UpdateProjectGroupDto } from './dto/update-project-group.dto';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/entities/team-member.entity';

@Injectable()
export class ProjectGroupsService {
  constructor(
    @InjectRepository(ProjectGroup)
    private projectGroupRepository: Repository<ProjectGroup>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async create(createProjectGroupDto: CreateProjectGroupDto, teamId: string, userId: string): Promise<ProjectGroup> {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权创建项目组');
    }

    // 检查团队内名称是否唯一
    const existing = await this.projectGroupRepository.findOne({
      where: { team_id: teamId, name: createProjectGroupDto.name },
    });

    if (existing) {
      throw new BadRequestException('项目组名称已存在');
    }

    const projectGroup = this.projectGroupRepository.create({
      ...createProjectGroupDto,
      team_id: teamId,
    });

    return this.projectGroupRepository.save(projectGroup);
  }

  async findAll(teamId: string, userId: string): Promise<ProjectGroup[]> {
    // 检查权限
    await this.teamsService.findOne(teamId, userId);

    return this.projectGroupRepository.find({
      where: { team_id: teamId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, teamId: string, userId: string): Promise<ProjectGroup> {
    // 检查权限
    await this.teamsService.findOne(teamId, userId);

    const projectGroup = await this.projectGroupRepository.findOne({
      where: { id, team_id: teamId },
      relations: ['projects'],
    });

    if (!projectGroup) {
      throw new NotFoundException('项目组不存在');
    }

    return projectGroup;
  }

  async update(
    id: string,
    teamId: string,
    updateProjectGroupDto: UpdateProjectGroupDto,
    userId: string,
  ): Promise<ProjectGroup> {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权修改项目组');
    }

    const projectGroup = await this.findOne(id, teamId, userId);

    // 如果修改名称，检查唯一性
    if (updateProjectGroupDto.name && updateProjectGroupDto.name !== projectGroup.name) {
      const existing = await this.projectGroupRepository.findOne({
        where: { team_id: teamId, name: updateProjectGroupDto.name },
      });

      if (existing) {
        throw new BadRequestException('项目组名称已存在');
      }
    }

    Object.assign(projectGroup, updateProjectGroupDto);
    return this.projectGroupRepository.save(projectGroup);
  }

  async remove(id: string, teamId: string, userId: string): Promise<void> {
    // 检查权限
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权删除项目组');
    }

    const projectGroup = await this.findOne(id, teamId, userId);

    // TODO: 检查是否有项目使用此项目组
    // 如果有项目使用，应该先更新项目的group_id为null或移动到其他组

    await this.projectGroupRepository.remove(projectGroup);
  }
}

