import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(12)
  @Type(() => String)
  code: string;
}


