import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { TeamMember, MemberStatus } from '../teams/entities/team-member.entity';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class DevAdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private jwtService: JwtService,
  ) {}

  /**
   * 创建新用户
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new Error('邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      email: createUserDto.email,
      name: createUserDto.name,
      password_hash: hashedPassword,
      role: createUserDto.role || UserRole.MEMBER,
      avatar_url: createUserDto.avatar_url,
      is_active: true,
    });

    return await this.userRepository.save(user);
  }

  /**
   * 获取所有用户（包含团队信息）
   */
  async getAllUsers(): Promise<any[]> {
    const users = await this.userRepository.find({
      relations: ['team_members', 'team_members.team'],
      order: { created_at: 'DESC' },
    });

    return users.map(user => {
      const teamMembers = user.team_members || [];
      const activeTeamMember = teamMembers.find(
        tm => tm.status === MemberStatus.ACTIVE
      );

      // 优先显示用户的系统角色（user.role），如果没有团队成员关系，则显示系统角色
      // 如果有团队成员关系，同时显示系统角色和团队角色
      const systemRole = typeof user.role === 'string' ? user.role : String(user.role);
      const teamRole = activeTeamMember ? this.mapTeamRole(activeTeamMember.role) : null;
      
      // 显示格式：如果有团队角色，显示 "系统角色 (团队角色)"，否则只显示系统角色
      const displayRole = teamRole 
        ? `${this.mapSystemRole(systemRole)} (${teamRole})` 
        : this.mapSystemRole(systemRole);

      return {
        id: user.id,
        username: user.name,
        email: user.email,
        phone: user.phone || '',
        teamName: activeTeamMember?.team?.name || (user.team_id ? '未知团队' : ''),
        role: displayRole,
        // 添加原始角色字段，便于调试
        systemRole: systemRole,
        teamRole: teamRole,
        status: user.is_active ? 'Active' : 'Inactive',
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    });
  }

  /**
   * 映射团队角色
   */
  private mapTeamRole(role: string): string {
    const roleMap = {
      'super_admin': 'Owner',
      'admin': 'Admin',
      'member': 'Member',
    };
    return roleMap[role] || role;
  }

  /**
   * 映射系统角色（users.role 字段）
   */
  private mapSystemRole(role: string): string {
    const roleMap = {
      'admin': 'Admin',
      'member': 'Member',
      'viewer': 'Viewer',
      'sales': 'Sales',
      'DEV_SUPER_ADMIN': 'Dev Super Admin',
    };
    return roleMap[role] || role;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, data: { email?: string; phone?: string; is_active?: boolean }): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('用户不存在');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: data.email },
      });
      if (existingUser) {
        throw new Error('邮箱已存在');
      }
    }

    await this.userRepository.update(id, data);
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 重置密码为默认密码
   */
  async resetPassword(id: string, defaultPassword: string = '123456'): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await this.userRepository.update(id, { password_hash: hashedPassword });
  }

  /**
   * 软删除用户（设置为非激活状态）
   */
  async softDeleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('用户不存在');
    }

    await this.userRepository.update(id, { is_active: false });
  }

  /**
   * 模拟登录（生成token）
   */
  async impersonateUser(id: string): Promise<{ access_token: string; user: any }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('用户不存在');
    }

    const role = typeof user.role === 'string' ? user.role : String(user.role);
    const payload = { email: user.email, sub: user.id, role: role };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: role,
        avatar_url: user.avatar_url,
      },
    };
  }
}

