import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  client: string;

  @IsString()
  lead: string;

  @IsString()
  post_lead: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  monthPrefix?: string;

  @IsOptional()
  @IsDateString()
  created_date?: string;
}

