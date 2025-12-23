import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  @Type(() => String)
  email: string;

  @IsString()
  @MinLength(6)
  @Type(() => String)
  password: string;

  @IsString()
  @Type(() => String)
  name: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  avatar_url?: string;

  @IsOptional()
  @IsEnum(UserRole)
  @Type(() => String)
  role?: UserRole;
}

