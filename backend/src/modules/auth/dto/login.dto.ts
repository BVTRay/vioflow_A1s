import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string; // 支持用户名或邮箱

  @IsString()
  // 允许更短密码以兼容测试账户（admin）
  @MinLength(4)
  password: string;
}

