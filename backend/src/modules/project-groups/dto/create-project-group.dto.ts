import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProjectGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Type(() => String)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Type(() => String)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Type(() => String)
  icon?: string;
}


