import { IsEnum, IsOptional } from 'class-validator';
import { TeamRole, MemberStatus } from '../entities/team-member.entity';

export class UpdateTeamMemberDto {
  @IsEnum(TeamRole)
  @IsOptional()
  role?: TeamRole;

  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;
}

