import { IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class WechatLoginDto {
  @IsString()
  @Type(() => String)
  code: string; // 微信登录 code
}






