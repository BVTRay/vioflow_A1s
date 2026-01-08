import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface WechatUserInfo {
  openid: string;
  session_key: string;
  unionid?: string;
  nickName?: string;
  avatarUrl?: string;
}

interface WechatSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

interface WechatPhoneInfo {
  phoneNumber: string;
  purePhoneNumber: string;
  countryCode: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private accessToken: string | null = null;
  private accessTokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {}

  /**
   * 获取微信用户信息
   */
  async getUserInfo(code: string): Promise<WechatUserInfo> {
    try {
      const session = await this.code2Session(code);
      
      return {
        openid: session.openid,
        session_key: session.session_key,
        unionid: session.unionid,
      };
    } catch (error) {
      this.logger.error('获取微信用户信息失败', error.stack);
      throw error;
    }
  }

  /**
   * code2Session - 获取 openid 和 session_key
   */
  async code2Session(code: string): Promise<WechatSession> {
    try {
      const appId = this.configService.get<string>('WECHAT_APP_ID');
      const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

      if (!appId || !appSecret) {
        throw new BadRequestException('微信配置不完整');
      }

      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const response = await axios.get(url, {
        params: {
          appid: appId,
          secret: appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      });

      if (response.data.errcode) {
        this.logger.error(`微信 code2Session 失败: ${response.data.errmsg}`);
        throw new BadRequestException(`微信登录失败: ${response.data.errmsg}`);
      }

      return {
        openid: response.data.openid,
        session_key: response.data.session_key,
        unionid: response.data.unionid,
      };
    } catch (error) {
      this.logger.error('code2Session 失败', error.stack);
      throw error;
    }
  }

  /**
   * 获取 Access Token
   */
  async getAccessToken(): Promise<string> {
    try {
      // 如果 token 未过期，直接返回
      if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
        return this.accessToken;
      }

      const appId = this.configService.get<string>('WECHAT_APP_ID');
      const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

      if (!appId || !appSecret) {
        throw new BadRequestException('微信配置不完整');
      }

      const url = 'https://api.weixin.qq.com/cgi-bin/token';
      const response = await axios.get(url, {
        params: {
          grant_type: 'client_credential',
          appid: appId,
          secret: appSecret,
        },
      });

      if (response.data.errcode) {
        this.logger.error(`获取 Access Token 失败: ${response.data.errmsg}`);
        throw new BadRequestException(`获取微信 Access Token 失败: ${response.data.errmsg}`);
      }

      this.accessToken = response.data.access_token;
      // 提前5分钟过期
      this.accessTokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

      this.logger.log('成功获取微信 Access Token');
      return this.accessToken;
    } catch (error) {
      this.logger.error('获取 Access Token 失败', error.stack);
      throw error;
    }
  }

  /**
   * 生成小程序码
   * @param scene 场景值（传递给小程序的参数）
   * @param page 小程序页面路径
   * @returns 小程序码图片 Buffer
   */
  async generateQrCode(scene: string, page?: string): Promise<Buffer> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

      const defaultPage = this.configService.get<string>('WECHAT_QR_PAGE', 'pages/phone-login/index');
      const envVersion = this.configService.get<string>('WECHAT_QR_ENV', 'develop'); // release, trial, develop
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

      const response = await axios.post(
        url,
        {
          scene, // 场景值，最大32个可见字符
          page: page || defaultPage, // 页面路径
          check_path: isProduction, // 生产环境检查页面路径，开发环境不检查
          env_version: envVersion, // 版本：release（正式版）、trial（体验版）、develop（开发版）
          width: 280, // 二维码宽度
        },
        {
          responseType: 'arraybuffer', // 返回二进制数据
        },
      );

      // 检查是否返回错误（微信会返回JSON错误）
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(Buffer.from(response.data).toString());
        this.logger.error(`生成小程序码失败: ${errorData.errmsg}`, errorData); // 打印完整错误数据
        throw new BadRequestException(`生成小程序码失败: ${errorData.errmsg}`);
      }

      this.logger.log(`成功生成小程序码: scene=${scene}, page=${page || defaultPage}, env_version=${envVersion}`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('生成小程序码失败', error.stack);
      throw error;
    }
  }

  /**
   * 解密微信数据
   */
  decryptData(encryptedData: string, iv: string, sessionKey: string): any {
    try {
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');

      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(encryptedDataBuffer, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      const data = JSON.parse(decrypted);

      // 验证 appId
      const appId = this.configService.get<string>('WECHAT_APP_ID');
      if (data.watermark.appid !== appId) {
        throw new BadRequestException('数据解密失败：appId 不匹配');
      }

      return data;
    } catch (error) {
      this.logger.error('解密微信数据失败', error.stack);
      throw new BadRequestException('数据解密失败');
    }
  }

  /**
   * 解密手机号
   */
  decryptPhoneNumber(encryptedData: string, iv: string, sessionKey: string): WechatPhoneInfo {
    try {
      const data = this.decryptData(encryptedData, iv, sessionKey);
      
      return {
        phoneNumber: data.phoneNumber,
        purePhoneNumber: data.purePhoneNumber,
        countryCode: data.countryCode,
      };
    } catch (error) {
      this.logger.error('解密手机号失败', error.stack);
      throw error;
    }
  }
}

