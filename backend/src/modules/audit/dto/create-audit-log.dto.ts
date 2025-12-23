import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuditLogDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  team_id?: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  action: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  resource_type: string;

  @IsString()
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  resource_id?: string;

  @IsObject()
  @IsOptional()
  @Type(() => Object)
  old_value?: any;

  @IsObject()
  @IsOptional()
  @Type(() => Object)
  new_value?: any;

  @IsString()
  @IsOptional()
  @Type(() => String)
  ip_address?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  user_agent?: string;
}


