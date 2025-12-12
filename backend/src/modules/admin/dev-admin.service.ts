import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { TeamMember, MemberStatus } from '../teams/entities/team-member.entity';
import { JwtService } from '@nestjs/jwt';

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

      return {
        id: user.id,
        username: user.name,
        email: user.email,
        phone: user.phone || '',
        teamName: activeTeamMember?.team?.name || (user.team_id ? '未知团队' : ''),
        role: activeTeamMember ? this.mapTeamRole(activeTeamMember.role) : '个人用户',
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

