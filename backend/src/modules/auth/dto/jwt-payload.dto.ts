import { IsString, IsUUID, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class JwtPayloadDto {
  @IsOptional()
  @IsString()
  @Type(() => String)
  email?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  phone?: string;

  @IsUUID()
  @Type(() => String)
  sub: string;

  @IsString()
  @Type(() => String)
  role: string;
}















