import { IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { TeamRole, MemberStatus } from '../entities/team-member.entity';

export class UpdateTeamMemberDto {
  @IsEnum(TeamRole)
  @IsOptional()
  @Type(() => String)
  role?: TeamRole;

  @IsEnum(MemberStatus)
  @IsOptional()
  @Type(() => String)
  status?: MemberStatus;
}


