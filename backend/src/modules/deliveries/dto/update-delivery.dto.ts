import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDeliveryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasCleanFeed?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasMetadata?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasTechReview?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasCopyrightCheck?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasScript?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasCopyrightFiles?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasMultiResolution?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryNote?: string;
}












