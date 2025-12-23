import { IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  name?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  client?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  lead?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  post_lead?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  group?: string;
}

