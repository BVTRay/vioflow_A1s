import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamRole } from '../entities/team-member.entity';

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  user_id: string;

  @IsEnum(TeamRole)
  @IsOptional()
  @Type(() => String)
  role?: TeamRole;
}


