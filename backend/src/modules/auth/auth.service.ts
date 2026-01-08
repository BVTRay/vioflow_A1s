import { Injectable, UnauthorizedException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { PhoneLoginDto } from './dto/phone-login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { WechatQrCodeScanDto, WechatQrCodeConfirmDto, WechatQrCodeQuickLoginDto } from './dto/wechat-qrcode.dto';
import { SmsService } from './services/sms.service';
import { WechatService } from './services/wechat.service';
import { QrCodeScanService } from './services/qrcode-scan.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private smsService: SmsService,
    private wechatService: WechatService,
    private qrCodeScanService: QrCodeScanService,
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
        // 确保 role 为字符串格式（统一本地和云端）
        return {
          ...result,
          role: typeof result.role === 'string' ? result.role : String(result.role),
        };
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

      // 确保 role 为字符串格式（统一本地和云端）
      const role = typeof user.role === 'string' ? user.role : String(user.role);
      const payload = { 
        email: user.email, 
        sub: user.id, 
        role: role,
      };
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
    // 确保 role 为字符串格式（统一本地和云端）
    return {
      ...user,
      role: typeof user.role === 'string' ? user.role : String(user.role),
    };
  }

  /**
   * 手机号登录
   */
  async phoneLogin(phoneLoginDto: PhoneLoginDto) {
    try {
      this.logger.log(`手机号登录请求: phone=${phoneLoginDto.phone}, code=${phoneLoginDto.code}`);
      
      // 1. 验证验证码
      const isValid = await this.smsService.verifyCode(
        phoneLoginDto.phone,
        phoneLoginDto.code,
      );
      if (!isValid) {
        this.logger.warn(`验证码验证失败: phone=${phoneLoginDto.phone}, code=${phoneLoginDto.code}`);
        throw new UnauthorizedException('验证码错误或已过期');
      }
      
      this.logger.log(`验证码验证成功: phone=${phoneLoginDto.phone}`);

      // 2. 查找或创建用户
      let user = await this.userRepository.findOne({
        where: { phone: phoneLoginDto.phone },
      });

      if (!user) {
        // 创建新用户
        // 生成临时邮箱（如果用户后续绑定邮箱，可以更新）
        const tempEmail = `${phoneLoginDto.phone}@temp.vioflow.com`;
        
        // 检查临时邮箱是否已存在，如果存在则生成唯一邮箱
        let email = tempEmail;
        let counter = 1;
        while (await this.userRepository.findOne({ where: { email } })) {
          email = `${phoneLoginDto.phone}_${counter}@temp.vioflow.com`;
          counter++;
        }

        // 为手机号登录用户生成随机密码（手机号登录不需要密码，但数据库字段不能为空）
        const randomPassword = require('crypto').randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        user = this.userRepository.create({
          phone: phoneLoginDto.phone,
          email: email,
          name: `用户${phoneLoginDto.phone.slice(-4)}`,
          password_hash: passwordHash, // 生成随机密码哈希（手机号登录不使用密码）
          role: UserRole.MEMBER,
          is_active: true,
        });
        await this.userRepository.save(user);
        this.logger.log(`新用户通过手机号注册: ${phoneLoginDto.phone}`);
      }

      // 3. 检查用户是否激活
      if (!user.is_active) {
        throw new UnauthorizedException('账户已被禁用');
      }

      // 4. 生成 JWT token
      const role = typeof user.role === 'string' ? user.role : String(user.role);
      const payload = {
        email: user.email,
        phone: user.phone,
        sub: user.id,
        role: role,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: role,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`手机号登录失败: ${phoneLoginDto.phone}`, error.stack);
      throw error;
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(wechatLoginDto: WechatLoginDto) {
    try {
      // 1. 通过 code 获取微信用户信息
      const wechatUserInfo = await this.wechatService.getUserInfo(
        wechatLoginDto.code,
      );

      // 2. 查找或创建用户
      let user = await this.userRepository.findOne({
        where: { wechat_openid: wechatUserInfo.openid },
      });

      if (!user) {
        // 创建新用户
        // 生成临时邮箱
        const tempEmail = `${wechatUserInfo.openid}@wechat.vioflow.com`;
        
        // 检查临时邮箱是否已存在
        let email = tempEmail;
        let counter = 1;
        while (await this.userRepository.findOne({ where: { email } })) {
          email = `${wechatUserInfo.openid}_${counter}@wechat.vioflow.com`;
          counter++;
        }

        user = this.userRepository.create({
          wechat_openid: wechatUserInfo.openid,
          wechat_unionid: wechatUserInfo.unionid,
          email: email,
          name: wechatUserInfo.nickName || '微信用户',
          avatar_url: wechatUserInfo.avatarUrl,
          password_hash: '', // 微信登录不需要密码
          role: UserRole.MEMBER,
          is_active: true,
        });
        await this.userRepository.save(user);
        this.logger.log(`新用户通过微信注册: ${wechatUserInfo.openid}`);
      } else {
        // 更新用户信息（如果微信信息有变化）
        if (wechatUserInfo.unionid && !user.wechat_unionid) {
          user.wechat_unionid = wechatUserInfo.unionid;
        }
        if (wechatUserInfo.nickName && !user.name) {
          user.name = wechatUserInfo.nickName;
        }
        if (wechatUserInfo.avatarUrl && !user.avatar_url) {
          user.avatar_url = wechatUserInfo.avatarUrl;
        }
        await this.userRepository.save(user);
      }

      // 3. 检查用户是否激活
      if (!user.is_active) {
        throw new UnauthorizedException('账户已被禁用');
      }

      // 4. 生成 JWT token
      const role = typeof user.role === 'string' ? user.role : String(user.role);
      const payload = {
        email: user.email,
        phone: user.phone,
        sub: user.id,
        role: role,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: role,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`微信登录失败: ${wechatLoginDto.code}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建微信扫码登录二维码
   */
  async createQrCode() {
    return await this.qrCodeScanService.createScanSession();
  }

  /**
   * 检查扫码状态
   */
  async checkQrCodeStatus(scanId: string) {
    const session = this.qrCodeScanService.getScanStatus(scanId);
    if (!session) {
      return { status: 'expired' as const };
    }
    return {
      status: session.status,
      token: session.token,
      access_token: session.token,
      user: session.user,
    };
  }

  /**
   * 小程序扫码后调用
   */
  async scanQrCode(scanDto: WechatQrCodeScanDto) {
    await this.qrCodeScanService.onScanned(scanDto.scanId, scanDto.code);

    // 如果扫码用户已存在，直接完成登录并标记扫码会话
    const session = this.qrCodeScanService.getScanStatus(scanDto.scanId);
    if (!session?.openid) {
      throw new BadRequestException('扫码会话缺少 openid');
    }

    const user = await this.userRepository.findOne({
      where: { wechat_openid: session.openid },
    });

    if (!user) {
      // 未注册用户，保持 scanned 状态，交由小程序走绑定手机号流程
      return { needBind: true, status: 'scanned' as const };
    }

    if (!user.is_active) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 老用户：保持 scanned 状态，等待用户点击"确认授权"
    const role = typeof user.role === 'string' ? user.role : String(user.role);
    
    return {
      needBind: false,
      status: 'scanned' as const,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role,
        avatar_url: user.avatar_url,
      },
    };
  }

  /**
   * 小程序确认登录
   */
  async confirmQrCodeLogin(confirmDto: WechatQrCodeConfirmDto) {
    const session = this.qrCodeScanService.getScanStatus(confirmDto.scanId);
    if (!session || session.status !== 'scanned') {
      throw new UnauthorizedException('扫码会话无效');
    }

    // 如果提供了手机号和验证码，使用手机号登录（新用户绑定）
    if (confirmDto.phone && confirmDto.smsCode) {
      const phoneLoginResult = await this.phoneLogin({
        phone: confirmDto.phone,
        code: confirmDto.smsCode,
      });

      // 绑定微信 openid
      if (session.openid) {
        await this.userRepository.update(
          { id: phoneLoginResult.user.id },
          { wechat_openid: session.openid },
        );
      }
      
      // 更新扫码会话
      await this.qrCodeScanService.onConfirmed(
        confirmDto.scanId,
        phoneLoginResult.access_token,
        phoneLoginResult.user,
      );

      return phoneLoginResult;
    }

    // 老用户确认授权：使用 openid 查找用户并生成 token
    if (!session.openid) {
      throw new BadRequestException('扫码会话缺少 openid');
    }

    const user = await this.userRepository.findOne({
      where: { wechat_openid: session.openid },
    });

    if (!user) {
      throw new NotFoundException('用户不存在，请先绑定手机号');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('账户已被禁用');
    }

    const role = typeof user.role === 'string' ? user.role : String(user.role);
    const payload = {
      sub: user.id,
      role,
      phone: user.phone,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);

    await this.qrCodeScanService.onConfirmed(confirmDto.scanId, accessToken, {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role,
      avatar_url: user.avatar_url,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role,
        avatar_url: user.avatar_url,
      },
    };
  }

  /**
   * 微信手机号快捷登录
   */
  async quickLoginWithWechatPhone(quickLoginDto: WechatQrCodeQuickLoginDto) {
    try {
      // 1. 获取扫码会话
      const session = this.qrCodeScanService.getScanStatus(quickLoginDto.scanId);
      if (!session || session.status !== 'scanned') {
        throw new UnauthorizedException('扫码会话无效');
      }

      // 2. 获取 session_key
      if (!session.sessionKey) {
        throw new BadRequestException('缺少会话密钥');
      }

      // 3. 解密手机号
      const phoneInfo = this.wechatService.decryptPhoneNumber(
        quickLoginDto.encryptedData,
        quickLoginDto.iv,
        session.sessionKey,
      );

      this.logger.log(`微信手机号快捷登录: ${phoneInfo.purePhoneNumber}`);

      // 4. 查找或创建用户
      let user = await this.userRepository.findOne({
        where: { phone: phoneInfo.purePhoneNumber },
      });

      if (!user) {
        // 创建新用户
        const tempEmail = `${phoneInfo.purePhoneNumber}@wechat.vioflow.com`;
        
        // 检查临时邮箱是否已存在
        let email = tempEmail;
        let counter = 1;
        while (await this.userRepository.findOne({ where: { email } })) {
          email = `${phoneInfo.purePhoneNumber}_${counter}@wechat.vioflow.com`;
          counter++;
        }

        user = this.userRepository.create({
          phone: phoneInfo.purePhoneNumber,
          wechat_openid: session.openid,
          email: email,
          name: `用户${phoneInfo.purePhoneNumber.slice(-4)}`,
          password_hash: '', // 微信登录不需要密码
          role: UserRole.MEMBER,
          is_active: true,
        });
        await this.userRepository.save(user);
        this.logger.log(`新用户通过微信手机号注册: ${phoneInfo.purePhoneNumber}`);
      } else {
        // 如果用户存在但没有绑定微信，则绑定
        if (!user.wechat_openid && session.openid) {
          user.wechat_openid = session.openid;
          await this.userRepository.save(user);
          this.logger.log(`用户绑定微信 openid: ${phoneInfo.purePhoneNumber}`);
        }
      }

      // 5. 检查用户是否激活
      if (!user.is_active) {
        throw new UnauthorizedException('账户已被禁用');
      }

      // 6. 生成 JWT token
      const role = typeof user.role === 'string' ? user.role : String(user.role);
      const payload = {
        email: user.email,
        phone: user.phone,
        sub: user.id,
        role: role,
      };

      const loginResult = {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: role,
          avatar_url: user.avatar_url,
        },
      };

      // 7. 更新扫码会话
      await this.qrCodeScanService.onConfirmed(
        quickLoginDto.scanId,
        loginResult.access_token,
        loginResult.user,
      );

      return loginResult;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`微信手机号快捷登录失败`, error.stack);
      throw error;
    }
  }
}

