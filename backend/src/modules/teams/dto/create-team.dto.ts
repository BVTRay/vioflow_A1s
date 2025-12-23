import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamDto {
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
}


