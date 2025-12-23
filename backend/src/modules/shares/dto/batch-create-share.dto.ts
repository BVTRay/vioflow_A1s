import { IsArray, IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchCreateShareDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  @Type(() => Array)
  videoIds: string[];

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  allowDownload?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  hasPassword?: boolean;

  @IsString()
  @IsOptional()
  @Type(() => String)
  password?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  expiresAt?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  justification?: string;
}


