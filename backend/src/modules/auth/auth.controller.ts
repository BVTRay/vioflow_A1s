import { Controller, Post, Body, Get, UseGuards, Request, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 登录接口：1分钟内最多5次
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      this.logger.log(`Login attempt for: ${loginDto.username}`);
      const result = await this.authService.login(loginDto);
      this.logger.log(`Login successful for: ${loginDto.username}`);
      return result;
    } catch (error) {
      this.logger.error(`Login failed for: ${loginDto.username}`, error.stack);
      
      // 如果是已知的错误（如 UnauthorizedException），直接抛出
      if (error instanceof HttpException) {
        throw error;
      }
      
      // 判断是否为生产环境
      const isProduction = this.configService.get('NODE_ENV') === 'production';
      
      // 其他错误返回 500
      // 在生产环境不暴露详细错误，在开发环境返回详细错误信息
      const errorMessage = error?.message || 'Internal server error';
      const errorResponse: any = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: isProduction ? 'Internal server error' : errorMessage,
        error: 'Internal Server Error',
      };
      
      // 在非生产环境，添加更多调试信息
      if (!isProduction) {
        errorResponse.details = {
          errorType: error?.constructor?.name || 'Unknown',
          message: errorMessage,
          // 不包含 stack trace，避免暴露敏感信息
        };
      }
      
      throw new HttpException(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    // 从数据库重新读取用户信息，确保获取最新的角色（而不是JWT token中的旧角色）
    const latestUser = await this.authService.validateToken({ sub: req.user.id });
    
    // 确保 role 返回为字符串格式（统一本地和云端）
    const role = typeof latestUser.role === 'string' ? latestUser.role : String(latestUser.role);
    return {
      id: latestUser.id,
      email: latestUser.email,
      name: latestUser.name,
      role: role,
      avatar_url: latestUser.avatar_url,
      team_id: latestUser.team_id,
      phone: latestUser.phone,
      is_active: latestUser.is_active,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }
}

