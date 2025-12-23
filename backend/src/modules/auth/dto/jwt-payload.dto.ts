import { IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class JwtPayloadDto {
  @IsString()
  @Type(() => String)
  email: string;

  @IsUUID()
  @Type(() => String)
  sub: string;

  @IsString()
  @Type(() => String)
  role: string;
}


