import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      this.logger.debug(`Attempting to find user: ${username}`);
      
      // 支持用户名或邮箱登录
      const user = await this.userRepository.findOne({
        where: [{ email: username }, { name: username }],
      });
      
      if (!user) {
        this.logger.warn(`User not found: ${username}`);
        return null;
      }
      
      this.logger.debug(`User found: ${user.email}, checking password...`);
      
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (isPasswordValid) {
        this.logger.debug(`Password valid for user: ${user.email}`);
        const { password_hash, ...result } = user;
        return result;
      }
      
      this.logger.warn(`Invalid password for user: ${username}`);
      return null;
    } catch (error) {
      this.logger.error(`Error validating user: ${username}`, error.stack);
      this.logger.error(`Error details: ${error.message}`);
      this.logger.error(`Error code: ${error.code || 'N/A'}`);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.username, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { email: user.email, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      // 如果是 UnauthorizedException，直接抛出
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // 其他错误（如数据库连接错误）记录并重新抛出
      this.logger.error(`Login error for: ${loginDto.username}`, error.stack);
      throw error;
    }
  }

  async validateToken(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

