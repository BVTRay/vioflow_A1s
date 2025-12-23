import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  @Type(() => String)
  name: string;

  @IsString()
  @Type(() => String)
  client: string;

  @IsString()
  @Type(() => String)
  lead: string;

  @IsString()
  @Type(() => String)
  post_lead: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  group?: string;

  @IsUUID()
  @IsOptional()
  @Type(() => String)
  teamId?: string;

  @IsUUID()
  @IsOptional()
  @Type(() => String)
  groupId?: string;

  @IsString()
  @IsOptional()
  @Type(() => String)
  monthPrefix?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  created_date?: string;
}

