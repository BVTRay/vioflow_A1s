import { IsString, IsOptional } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  client?: string;

  @IsOptional()
  @IsString()
  lead?: string;

  @IsOptional()
  @IsString()
  post_lead?: string;

  @IsOptional()
  @IsString()
  group?: string;
}

