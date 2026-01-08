import { Controller, Post, Body, Get, UseGuards, Request, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PhoneLoginDto } from './dto/phone-login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { WechatQrCodeScanDto, WechatQrCodeConfirmDto, WechatQrCodeQuickLoginDto } from './dto/wechat-qrcode.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './services/sms.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private smsService: SmsService,
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

  /**
   * 发送短信验证码
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 1分钟内最多3次
  @Post('send-sms')
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    try {
      // 使用 plainToInstance 和 validate 进行 DTO 验证
      const dto = plainToInstance(SendSmsDto, sendSmsDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '手机号格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`发送验证码请求: ${sendSmsDto.phone}`);
      const result = await this.smsService.sendCode(sendSmsDto.phone);
      this.logger.log(`验证码发送成功: ${sendSmsDto.phone}`);
      return result;
    } catch (error) {
      this.logger.error(`发送验证码失败: ${sendSmsDto.phone}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '发送验证码失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 手机号登录
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1分钟内最多5次
  @Post('phone-login')
  async phoneLogin(@Body() phoneLoginDto: PhoneLoginDto) {
    try {
      // 使用 plainToInstance 和 validate 进行 DTO 验证
      const dto = plainToInstance(PhoneLoginDto, phoneLoginDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '请求参数格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`手机号登录尝试: ${phoneLoginDto.phone}`);
      const result = await this.authService.phoneLogin(dto);
      this.logger.log(`手机号登录成功: ${phoneLoginDto.phone}`);
      return result;
    } catch (error) {
      this.logger.error(`手机号登录失败: ${phoneLoginDto.phone}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '登录失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 微信登录
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 1分钟内最多10次
  @Post('wechat-login')
  async wechatLogin(@Body() wechatLoginDto: WechatLoginDto) {
    try {
      // 使用 plainToInstance 和 validate 进行 DTO 验证
      const dto = plainToInstance(WechatLoginDto, wechatLoginDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '请求参数格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`微信登录尝试: code=${wechatLoginDto.code.substring(0, 10)}...`);
      const result = await this.authService.wechatLogin(dto);
      this.logger.log(`微信登录成功`);
      return result;
    } catch (error) {
      this.logger.error(`微信登录失败`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '登录失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建微信扫码登录二维码
   */
  @Post('wechat-qrcode')
  async createQrCode() {
    try {
      const result = await this.authService.createQrCode();
      return result;
    } catch (error) {
      this.logger.error('创建二维码失败', error.stack);
      throw new HttpException(
        { message: error.message || '创建二维码失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 检查扫码状态
   */
  @Get('wechat-qrcode/:scanId')
  async checkQrCodeStatus(@Request() req) {
    try {
      const scanId = req.params.scanId;
      const result = await this.authService.checkQrCodeStatus(scanId);
      return result;
    } catch (error) {
      this.logger.error('检查扫码状态失败', error.stack);
      throw new HttpException(
        { message: error.message || '检查扫码状态失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 小程序扫码后调用
   */
  @Post('wechat-qrcode/scan')
  async scanQrCode(@Body() scanDto: WechatQrCodeScanDto) {
    try {
      const dto = plainToInstance(WechatQrCodeScanDto, scanDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '请求参数格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.scanQrCode(dto);
      return result;
    } catch (error) {
      this.logger.error('扫码失败', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '扫码失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 小程序确认登录
   */
  @Post('wechat-qrcode/confirm')
  async confirmQrCodeLogin(@Body() confirmDto: WechatQrCodeConfirmDto) {
    try {
      const dto = plainToInstance(WechatQrCodeConfirmDto, confirmDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '请求参数格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.confirmQrCodeLogin(dto);
      return result;
    } catch (error) {
      this.logger.error('确认登录失败', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '确认登录失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 小程序微信手机号快捷登录
   */
  @Post('wechat-qrcode/quick-login')
  async quickLoginWithWechatPhone(@Body() quickLoginDto: WechatQrCodeQuickLoginDto) {
    try {
      const dto = plainToInstance(WechatQrCodeQuickLoginDto, quickLoginDto);
      const errors = await validate(dto);
      
      if (errors.length > 0) {
        throw new HttpException(
          { message: '请求参数格式不正确', errors },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.quickLoginWithWechatPhone(dto);
      return result;
    } catch (error) {
      this.logger.error('微信手机号快捷登录失败', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { message: error.message || '快捷登录失败' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

