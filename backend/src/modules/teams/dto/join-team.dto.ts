import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class JoinTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(12)
  code: string;
}

