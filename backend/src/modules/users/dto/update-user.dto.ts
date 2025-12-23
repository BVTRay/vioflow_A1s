import { IsString, IsEmail, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Type(() => String)
  name?: string;

  @IsOptional()
  @IsEmail()
  @Type(() => String)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Type(() => String)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @Type(() => String)
  avatar_url?: string;
}


