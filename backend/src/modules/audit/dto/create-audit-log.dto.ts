import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  resource_type: string;

  @IsString()
  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @IsObject()
  @IsOptional()
  old_value?: any;

  @IsObject()
  @IsOptional()
  new_value?: any;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
}


