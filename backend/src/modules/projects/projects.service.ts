import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectMember, MemberRole } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private memberRepository: Repository<ProjectMember>,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
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

    return savedProject;
  }

  async findAll(filters?: {
    status?: ProjectStatus;
    group?: string;
    month?: string;
  }): Promise<Project[]> {
    const query = this.projectRepository.createQueryBuilder('project');

    if (filters?.status) {
      query.andWhere('project.status = :status', { status: filters.status });
    }

    if (filters?.group) {
      query.andWhere('project.group = :group', { group: filters.group });
    }

    if (filters?.month) {
      query.andWhere('project.created_date::text LIKE :month', {
        month: `${filters.month}%`,
      });
    }

    return query.getMany();
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

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async finalize(id: string): Promise<Project> {
    const project = await this.findOne(id);
    project.status = ProjectStatus.FINALIZED;
    project.finalized_at = new Date();
    return this.projectRepository.save(project);
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

  async getActiveProjects(limit: number = 10): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.last_activity_at IS NOT NULL')
      .orderBy('project.last_activity_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async getRecentOpened(limit: number = 10): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.last_opened_at IS NOT NULL')
      .orderBy('project.last_opened_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  async unlock(id: string, justification: string): Promise<Project> {
    const project = await this.findOne(id);
    // 记录解锁理由（可以存储到日志表）
    return project;
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    return this.memberRepository.find({
      where: { project_id: projectId },
      relations: ['user'],
    });
  }

  async addMember(projectId: string, userId: string, role: string = MemberRole.MEMBER): Promise<ProjectMember> {
    const member = this.memberRepository.create({
      project_id: projectId,
      user_id: userId,
      role: (role as MemberRole) || MemberRole.MEMBER,
    });
    return this.memberRepository.save(member);
  }
}

