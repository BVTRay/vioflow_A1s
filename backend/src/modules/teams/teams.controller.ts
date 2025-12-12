import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { JoinTeamDto } from './dto/join-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto, @Request() req) {
    return this.teamsService.create(createTeamDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.teamsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto, @Request() req) {
    return this.teamsService.update(id, updateTeamDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Request() req) {
    return this.teamsService.getMembers(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() addMemberDto: AddTeamMemberDto, @Request() req) {
    return this.teamsService.addMember(id, addMemberDto, req.user.id);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateTeamMemberDto,
    @Request() req,
  ) {
    return this.teamsService.updateMember(id, memberId, updateMemberDto, req.user.id);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    return this.teamsService.removeMember(id, memberId, req.user.id);
  }

  @Post('join')
  joinByCode(@Body() joinTeamDto: JoinTeamDto, @Request() req) {
    return this.teamsService.joinByCode(joinTeamDto, req.user.id);
  }

  @Get(':id/role')
  getUserRole(@Param('id') id: string, @Request() req) {
    return this.teamsService.getUserRole(id, req.user.id);
  }
}

