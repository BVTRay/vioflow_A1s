import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
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
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('group') group?: string, @Query('month') month?: string) {
    return this.projectsService.findAll({ status, group, month } as any);
  }

  @Get('active')
  getActiveProjects(@Query('limit') limit?: number) {
    return this.projectsService.getActiveProjects(limit ? parseInt(limit.toString()) : 10);
  }

  @Get('recent-opened')
  getRecentOpened(@Query('limit') limit?: number) {
    return this.projectsService.getRecentOpened(limit ? parseInt(limit.toString()) : 10);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Post(':id/finalize')
  finalize(@Param('id') id: string) {
    return this.projectsService.finalize(id);
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
  getMembers(@Param('id') id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.projectsService.addMember(id, body.userId, body.role);
  }
}

