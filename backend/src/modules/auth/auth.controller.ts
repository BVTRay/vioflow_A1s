import { Controller, Post, Body, Get, UseGuards, Request, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      avatar_url: req.user.avatar_url,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }
}

