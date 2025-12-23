import { IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @IsString()
  @Type(() => String)
  username: string; // 支持用户名或邮箱

  @IsString()
  @MinLength(4)
  @Type(() => String)
  password: string; // 允许更短密码以兼容测试账户（admin）
}

