import { IsArray, IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsString } from 'class-validator';

export class BatchCreateShareDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  videoIds: string[];

  @IsBoolean()
  @IsOptional()
  allowDownload?: boolean;

  @IsBoolean()
  @IsOptional()
  hasPassword?: boolean;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  justification?: string;
}


