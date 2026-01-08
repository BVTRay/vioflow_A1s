import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WechatService } from './wechat.service';

interface QrCodeScanSession {
  scanId: string;
  status: 'pending' | 'scanned' | 'confirmed' | 'expired';
  openid?: string;
  code?: string;
  sessionKey?: string;
  token?: string;
  user?: any;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class QrCodeScanService {
  private readonly logger = new Logger(QrCodeScanService.name);
  private readonly scanSessions = new Map<string, QrCodeScanSession>(); // 内存存储，生产环境应使用 Redis
  private readonly SESSION_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟过期

  constructor(
    private configService: ConfigService,
    private wechatService: WechatService,
  ) {}

  /**
   * 生成扫码ID
   */
  private generateScanId(): string {
    // 微信小程序码 scene 上限 32 字符，这里使用 8 字节（16 hex）的短 ID，scene 形如 "sid=xxxxxxxxxxxxxxxx"
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 创建扫码会话
   */
  async createScanSession(): Promise<{ qrCode: string; scanId: string }> {
    const scanId = this.generateScanId();
    const expiresAt = Date.now() + this.SESSION_EXPIRE_TIME;

    const session: QrCodeScanSession = {
      scanId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt,
    };

    this.scanSessions.set(scanId, session);

    try {
      // 生成微信小程序码
      // scene 参数会传递给小程序，格式为 scanId=xxx
      const scene = `sid=${scanId}`; // 使用短名称节省字符
      
      // 调用微信API生成小程序码
      const qrCodeBuffer = await this.wechatService.generateQrCode(scene, 'pages/scan/index');
      
      // 转换为 Base64 DataURL 格式
      const qrCodeDataUrl = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;

      // 清理过期会话
      this.cleanExpiredSessions();

      this.logger.log(`创建扫码会话成功: scanId=${scanId}`);

      return {
        qrCode: qrCodeDataUrl,
        scanId,
      };
    } catch (error) {
      // 如果生成小程序码失败，删除会话
      this.scanSessions.delete(scanId);
      this.logger.error('创建扫码会话失败', error.stack);
      throw error;
    }
  }

  /**
   * 获取扫码状态
   */
  getScanStatus(scanId: string): QrCodeScanSession | null {
    const session = this.scanSessions.get(scanId);
    if (!session) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      this.scanSessions.delete(scanId);
      return session;
    }

    return session;
  }

  /**
   * 小程序扫码后调用（更新状态为已扫码）
   */
  async onScanned(scanId: string, code: string): Promise<void> {
    const session = this.scanSessions.get(scanId);
    if (!session) {
      throw new NotFoundException('扫码会话不存在或已过期');
    }

    // 允许 pending 和 scanned 状态下扫码（支持重复扫码）
    if (session.status !== 'pending' && session.status !== 'scanned') {
      throw new BadRequestException('扫码会话状态不正确');
    }

    // 通过 code 获取 session_key（用于后续解密手机号）
    try {
      const wechatUserInfo = await this.wechatService.getUserInfo(code);
      session.status = 'scanned';
      session.code = code;
      session.openid = wechatUserInfo.openid;
      session.sessionKey = wechatUserInfo.session_key; // 保存 session_key 用于解密手机号
      this.scanSessions.set(scanId, session);
      this.logger.log(`扫码成功: scanId=${scanId}, openid=${wechatUserInfo.openid}`);
    } catch (error) {
      this.logger.error(`扫码失败: scanId=${scanId}`, error.stack);
      throw error;
    }
  }

  /**
   * 保存 session_key（用于解密手机号）
   */
  saveSessionKey(scanId: string, sessionKey: string): void {
    const session = this.scanSessions.get(scanId);
    if (session) {
      session.sessionKey = sessionKey;
      this.scanSessions.set(scanId, session);
    }
  }

  /**
   * 获取 session_key
   */
  getSessionKey(scanId: string): string | undefined {
    const session = this.scanSessions.get(scanId);
    return session?.sessionKey;
  }

  /**
   * 小程序确认登录后调用（更新状态为已确认）
   */
  async onConfirmed(scanId: string, token: string, user: any): Promise<void> {
    const session = this.scanSessions.get(scanId);
    if (!session) {
      throw new NotFoundException('扫码会话不存在或已过期');
    }

    if (session.status !== 'scanned') {
      throw new BadRequestException('扫码会话状态不正确');
    }

    session.status = 'confirmed';
    session.token = token;
    session.user = user;
    this.scanSessions.set(scanId, session);
  }

  /**
   * 清理过期会话
   */
  private cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [scanId, session] of this.scanSessions.entries()) {
      if (now > session.expiresAt) {
        this.scanSessions.delete(scanId);
      }
    }
  }
}



