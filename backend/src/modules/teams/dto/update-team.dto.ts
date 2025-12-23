import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Type(() => String)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Type(() => String)
  description?: string;
}


