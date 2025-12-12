import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TeamRole } from '../entities/team-member.entity';

export class AddTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsEnum(TeamRole)
  @IsOptional()
  role?: TeamRole;
}

