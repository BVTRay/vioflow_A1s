import { IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class WechatQrCodeScanDto {
  @IsString()
  @Type(() => String)
  scanId: string; // 扫码ID

  @IsString()
  @Type(() => String)
  code: string; // 微信登录 code
}

export class WechatQrCodeConfirmDto {
  @IsString()
  @Type(() => String)
  scanId: string; // 扫码ID

  @IsOptional()
  @IsString()
  @Type(() => String)
  phone?: string; // 手机号（如果使用手机号快捷登录）

  @IsOptional()
  @IsString()
  @Type(() => String)
  smsCode?: string; // 短信验证码（如果使用验证码登录）
}

export class WechatQrCodeQuickLoginDto {
  @IsString()
  @Type(() => String)
  scanId: string; // 扫码ID

  @IsString()
  @Type(() => String)
  encryptedData: string; // 加密的手机号数据

  @IsString()
  @Type(() => String)
  iv: string; // 初始向量
}



