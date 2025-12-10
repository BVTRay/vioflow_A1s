import { IsString, IsOptional, IsDateString } from 'class-validator';

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
  group: string;

  @IsOptional()
  @IsDateString()
  created_date?: string;
}

