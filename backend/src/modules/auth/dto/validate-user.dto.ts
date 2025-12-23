import { IsString, IsEmail, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateUserDto {
  @IsString()
  @Type(() => String)
  email: string;

  @IsString()
  @MinLength(4)
  @Type(() => String)
  password: string;
}


