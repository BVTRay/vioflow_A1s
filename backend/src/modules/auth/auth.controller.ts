import { Controller, Post, Body, Get, UseGuards, Request, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

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
      
      // 其他错误返回 500，但不暴露内部错误信息
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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

