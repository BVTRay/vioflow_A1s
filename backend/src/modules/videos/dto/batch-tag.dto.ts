import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchTagDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  @Type(() => Array)
  videoIds: string[];

  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  @Type(() => Array)
  tagIds: string[];
}


