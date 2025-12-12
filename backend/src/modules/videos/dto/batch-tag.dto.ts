import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class BatchTagDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  videoIds: string[];

  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  tagIds: string[];
}

