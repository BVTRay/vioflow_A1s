import { IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class PhoneLoginDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  @Type(() => String)
  phone: string;

  @IsString()
  @Type(() => String)
  code: string; // 验证码
}






