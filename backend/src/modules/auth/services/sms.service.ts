import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

interface SmsCode {
  code: string;
  phone: string;
  expiresAt: number;
  createdAt: number;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly codeStore = new Map<string, SmsCode>(); // 内存存储，生产环境应使用 Redis
  private readonly CODE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟过期
  private readonly CODE_LENGTH = 6; // 验证码长度

  constructor(private configService: ConfigService) {}

  /**
   * 生成随机验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 获取存储键
   */
  private getStoreKey(phone: string): string {
    return `sms:${phone}`;
  }

  /**
   * 发送验证码
   * @param phone 手机号
   * @returns 验证码（开发环境返回，生产环境不返回）
   */
  async sendCode(phone: string): Promise<{ success: boolean; code?: string }> {
    try {
      // 检查发送频率（同一手机号1分钟内只能发送一次）
      const existingCode = this.codeStore.get(this.getStoreKey(phone));
      if (existingCode) {
        const timeSinceLastSend = Date.now() - existingCode.createdAt;
        if (timeSinceLastSend < 60 * 1000) {
          throw new BadRequestException('发送过于频繁，请稍后再试');
        }
      }

      // 生成验证码
      const code = this.generateCode();
      const expiresAt = Date.now() + this.CODE_EXPIRE_TIME;

      // 存储验证码
      this.codeStore.set(this.getStoreKey(phone), {
        code,
        phone,
        expiresAt,
        createdAt: Date.now(),
      });

      // 清理过期验证码
      this.cleanExpiredCodes();

      // 根据配置选择短信服务商
      const smsProvider = this.configService.get<string>('SMS_PROVIDER', 'aliyun');
      
      if (smsProvider === 'aliyun') {
        await this.sendViaAliyun(phone, code);
      } else if (smsProvider === 'tencent') {
        await this.sendViaTencent(phone, code);
      } else {
        // 开发环境：直接返回验证码，不实际发送
        this.logger.warn(`开发模式：手机号 ${phone} 的验证码为 ${code}`);
      }

      const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
      return {
        success: true,
        ...(isDev && { code }), // 开发环境返回验证码
      };
    } catch (error) {
      this.logger.error(`发送验证码失败: ${phone}`, error.stack);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @returns 是否验证通过
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    const storeKey = this.getStoreKey(phone);
    const storedCode = this.codeStore.get(storeKey);

    this.logger.debug(`验证验证码: phone=${phone}, code=${code}, storeKey=${storeKey}`);
    this.logger.debug(`存储的验证码: ${storedCode ? JSON.stringify({ code: storedCode.code, expiresAt: storedCode.expiresAt, now: Date.now() }) : '不存在'}`);

    if (!storedCode) {
      this.logger.warn(`验证码不存在: ${phone}, storeKey=${storeKey}`);
      // 调试：打印所有存储的键
      this.logger.debug(`当前存储的所有验证码键: ${Array.from(this.codeStore.keys()).join(', ')}`);
      return false;
    }

    // 检查是否过期
    if (Date.now() > storedCode.expiresAt) {
      this.codeStore.delete(storeKey);
      this.logger.warn(`验证码已过期: ${phone}, 过期时间: ${new Date(storedCode.expiresAt).toISOString()}, 当前时间: ${new Date().toISOString()}`);
      return false;
    }

    // 验证码只能使用一次（严格字符串比较）
    const storedCodeStr = String(storedCode.code);
    const inputCodeStr = String(code);
    if (storedCodeStr !== inputCodeStr) {
      this.logger.warn(`验证码错误: ${phone}, 期望: ${storedCodeStr} (类型: ${typeof storedCode.code}), 实际: ${inputCodeStr} (类型: ${typeof code})`);
      return false;
    }

    // 验证成功后删除验证码
    this.codeStore.delete(storeKey);
    this.logger.log(`验证码验证成功: ${phone}`);
    return true;
  }

  /**
   * 通过阿里云发送短信
   */
  private async sendViaAliyun(phone: string, code: string): Promise<void> {
    const accessKeyId = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET');
    const signName = this.configService.get<string>('ALIYUN_SMS_SIGN_NAME');
    const templateCode = this.configService.get<string>('ALIYUN_SMS_TEMPLATE_CODE');

    if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
      this.logger.warn('阿里云短信配置不完整，跳过发送');
      return;
    }

    try {
      // 使用阿里云短信服务 API
      // 参考：https://help.aliyun.com/document_detail/101414.html
      const endpoint = 'dysmsapi.aliyuncs.com';
      const apiVersion = '2017-05-25';
      const action = 'SendSms';
      const regionId = 'cn-hangzhou';
      
      // 生成时间戳（UTC 时间，格式：YYYY-MM-DDTHH:mm:ssZ）
      const now = new Date();
      const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      // 构建请求参数（不包含 Signature）
      const params: any = {
        AccessKeyId: accessKeyId,
        Action: action,
        Format: 'JSON',
        PhoneNumbers: phone,
        RegionId: regionId,
        SignName: signName,
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        SignatureVersion: '1.0',
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ code }),
        Timestamp: timestamp,
        Version: apiVersion,
      };

      // 构建签名字符串
      // 1. 将参数按字典序排序
      const sortedKeys = Object.keys(params).sort();
      
      // 2. 构建查询字符串（需要对每个参数值进行 URL 编码）
      const queryString = sortedKeys
        .map((key) => {
          const value = params[key];
          // 特殊字符需要编码：* 需要编码为 %2A
          return `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/\*/g, '%2A')}`;
        })
        .join('&');
      
      // 3. 构建待签名字符串：HTTPMethod&URI&QueryString
      const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(queryString)}`;
      
      // 4. 计算签名（使用 HMAC-SHA1，密钥为 AccessKeySecret + '&'）
      const signature = crypto
        .createHmac('sha1', `${accessKeySecret}&`)
        .update(stringToSign)
        .digest('base64');
      
      // 5. 将签名添加到参数中
      params.Signature = signature;

      // 发送请求
      const response = await axios.post(`https://${endpoint}`, null, {
        params,
        timeout: 10000, // 10秒超时
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data && response.data.Code === 'OK') {
        this.logger.log(`[阿里云] 验证码发送成功: ${phone}，模板: ${templateCode}`);
      } else {
        this.logger.error(`[阿里云] 短信发送失败: ${phone}`, {
          code: response.data?.Code,
          message: response.data?.Message,
        });
        throw new Error(`短信发送失败: ${response.data?.Message || '未知错误'}`);
      }
    } catch (error) {
      this.logger.error(`[阿里云] 短信发送异常: ${phone}`, error.response?.data || error.message || error.stack);
      // 在生产环境抛出异常，开发环境允许继续运行
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw new BadRequestException(error.message || '短信发送失败，请稍后再试');
      } else {
        this.logger.warn(`[阿里云] 短信发送失败（开发模式，已在日志中记录验证码）: ${phone} -> ${code}`);
      }
    }
  }

  /**
   * 通过腾讯云发送短信
   */
  private async sendViaTencent(phone: string, code: string): Promise<void> {
    const secretId = this.configService.get<string>('TENCENT_SMS_SECRET_ID');
    const secretKey = this.configService.get<string>('TENCENT_SMS_SECRET_KEY');
    const appId = this.configService.get<string>('TENCENT_SMS_APP_ID');
    const signName = this.configService.get<string>('TENCENT_SMS_SIGN_NAME');
    const templateId = this.configService.get<string>('TENCENT_SMS_TEMPLATE_ID');

    if (!secretId || !secretKey || !appId) {
      this.logger.warn('腾讯云短信配置不完整（缺少 SecretId/SecretKey/AppId），跳过发送');
      this.logger.log(`[腾讯云] 验证码（未发送）: ${phone} -> ${code}`);
      return;
    }

    // 如果没有配置签名和模板ID，记录警告但不发送
    if (!signName || !templateId) {
      this.logger.warn('腾讯云短信配置不完整（缺少签名或模板ID），将在日志中记录验证码');
      this.logger.log(`[腾讯云] 验证码（未发送）: ${phone} -> ${code}`);
      return;
    }

    try {
      // 使用腾讯云 API v3 发送短信
      // 参考：https://cloud.tencent.com/document/product/382/43197
      const axios = require('axios');
      const crypto = require('crypto');
      
      const endpoint = 'sms.tencentcloudapi.com';
      const service = 'sms';
      const version = '2021-01-11';
      const action = 'SendSms';
      const region = 'ap-guangzhou'; // 默认使用广州地域
      const timestamp = Math.floor(Date.now() / 1000);
      
      // 构建请求参数（注意：TemplateId 需要是字符串）
      const params = {
        PhoneNumberSet: [`+86${phone}`],
        SmsSdkAppId: appId,
        SignName: signName,
        TemplateId: templateId.toString(), // 确保是字符串
        TemplateParamSet: [code], // 验证码作为模板参数
      };

      // 构建签名（TC3-HMAC-SHA256）
      const payload = JSON.stringify(params);
      const httpRequestMethod = 'POST';
      const canonicalUri = '/';
      const canonicalQueryString = '';
      const canonicalHeaders = `content-type:application/json\nhost:${endpoint}\n`;
      const signedHeaders = 'content-type;host';
      const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');
      
      const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
      
      const algorithm = 'TC3-HMAC-SHA256';
      const date = new Date(timestamp * 1000).toISOString().substring(0, 10).replace(/-/g, '');
      const credentialScope = `${date}/${service}/tc3_request`;
      const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
      const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
      
      // 计算签名
      const kDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
      const kService = crypto.createHmac('sha256', kDate).update(service).digest();
      const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest();
      const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
      
      // 构建 Authorization header
      const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
      
      // 发送请求
      this.logger.debug(`[腾讯云] 发送短信到 ${phone}，使用模板 ${templateId}`);
      
      const response = await axios.post(`https://${endpoint}`, params, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
          'X-TC-Action': action,
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Version': version,
          'X-TC-Region': region,
        },
        timeout: 10000, // 10秒超时
      });

      if (response.data && response.data.Response) {
        const result = response.data.Response;
        if (result.Error) {
          const errorCode = result.Error.Code;
          const errorMsg = result.Error.Message;
          this.logger.error(`腾讯云短信发送失败: ${errorMsg}`, {
            code: errorCode,
            phone,
            templateId,
            signName,
          });
          
          // 根据错误码提供更友好的错误信息
          let userFriendlyMsg = errorMsg;
          if (errorCode === 'InvalidParameterValue.TemplateIdNotFound') {
            userFriendlyMsg = '短信模板不存在，请检查模板ID';
          } else if (errorCode === 'InvalidParameterValue.SignNameNotFound') {
            userFriendlyMsg = '短信签名不存在，请检查签名名称';
          } else if (errorCode === 'InvalidParameterValue.PhoneNumberSet') {
            userFriendlyMsg = '手机号格式不正确';
          }
          
          throw new BadRequestException(`短信发送失败: ${userFriendlyMsg}`);
        } else {
          this.logger.log(`[腾讯云] 验证码发送成功: ${phone}，模板ID: ${templateId}`);
          // 记录发送结果（可选）
          if (result.SendStatusSet && result.SendStatusSet.length > 0) {
            const sendStatus = result.SendStatusSet[0];
            this.logger.debug(`发送状态: ${sendStatus.Code}, 消息: ${sendStatus.Message}`);
          }
        }
      } else {
        this.logger.warn(`[腾讯云] 收到异常响应格式:`, response.data);
        throw new Error('短信发送失败：收到异常响应');
      }
    } catch (error) {
      this.logger.error(`腾讯云短信发送异常: ${phone}`, error.stack || error.message);
      
      // 如果是 BadRequestException，直接抛出
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // 生产环境抛出异常，开发环境记录日志
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      if (isProduction) {
        throw new Error(`短信发送失败: ${error.message || '未知错误'}`);
      } else {
        // 开发环境：记录错误但不阻止流程，在日志中输出验证码
        this.logger.warn(`[开发环境] 短信发送失败，验证码: ${code}`);
      }
    }
  }

  /**
   * 清理过期的验证码
   */
  private cleanExpiredCodes(): void {
    const now = Date.now();
    for (const [key, smsCode] of this.codeStore.entries()) {
      if (now > smsCode.expiresAt) {
        this.codeStore.delete(key);
      }
    }
  }
}

