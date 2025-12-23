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
  Query,
  Headers,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Body() createProjectDto: CreateProjectDto, 
    @Request() req, 
    @Query('teamId') teamId?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头，最后使用 DTO 中的 teamId
    const finalTeamId = teamId || headerTeamId || createProjectDto.teamId;
    return this.projectsService.create(createProjectDto, req.user.id, finalTeamId);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('group') group?: string,
    @Query('month') month?: string,
    @Query('teamId') teamId?: string,
    @Query('groupId') groupId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头
    const finalTeamId = teamId || headerTeamId;
    return this.projectsService.findAll({
      status: status as any,
      group,
      month,
      teamId: finalTeamId,
      groupId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('active')
  getActiveProjects(
    @Query('limit') limit?: number, 
    @Query('teamId') teamId?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头
    const finalTeamId = teamId || headerTeamId;
    return this.projectsService.getActiveProjects(limit ? parseInt(limit.toString()) : 10, finalTeamId);
  }

  @Get('recent-opened')
  getRecentOpened(
    @Query('limit') limit?: number, 
    @Query('teamId') teamId?: string,
    @Headers('x-team-id') headerTeamId?: string,
  ) {
    // 优先使用查询参数，其次使用请求头
    const finalTeamId = teamId || headerTeamId;
    return this.projectsService.getRecentOpened(limit ? parseInt(limit.toString()) : 10, finalTeamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.projectsService.remove(id, req.user.id);
  }

  @Post(':id/finalize')
  finalize(@Param('id') id: string, @Request() req) {
    return this.projectsService.finalize(id, req.user.id);
  }

  @Patch(':id/last-opened')
  updateLastOpened(@Param('id') id: string) {
    return this.projectsService.updateLastOpened(id);
  }

  @Post(':id/unlock')
  unlock(@Param('id') id: string, @Body() body: { justification: string }) {
    return this.projectsService.unlock(id, body.justification);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Request() req) {
    return this.projectsService.getMembers(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: { userId: string; role?: string }, @Request() req) {
    return this.projectsService.addMember(id, body.userId, body.role, req.user.id);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    return this.projectsService.removeMember(id, memberId, req.user.id);
  }
}

