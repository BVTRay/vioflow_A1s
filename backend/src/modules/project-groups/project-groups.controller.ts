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
} from '@nestjs/common';
import { ProjectGroupsService } from './project-groups.service';
import { CreateProjectGroupDto } from './dto/create-project-group.dto';
import { UpdateProjectGroupDto } from './dto/update-project-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('project-groups')
@UseGuards(JwtAuthGuard)
export class ProjectGroupsController {
  constructor(private readonly projectGroupsService: ProjectGroupsService) {}

  @Post()
  create(@Body() createProjectGroupDto: CreateProjectGroupDto, @Request() req, @Query('teamId') teamId: string) {
    return this.projectGroupsService.create(createProjectGroupDto, teamId, req.user.id);
  }

  @Get()
  findAll(@Request() req, @Query('teamId') teamId: string) {
    return this.projectGroupsService.findAll(teamId, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req, @Query('teamId') teamId: string) {
    return this.projectGroupsService.findOne(id, teamId, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectGroupDto: UpdateProjectGroupDto,
    @Request() req,
    @Query('teamId') teamId: string,
  ) {
    return this.projectGroupsService.update(id, teamId, updateProjectGroupDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req, @Query('teamId') teamId: string) {
    return this.projectGroupsService.remove(id, teamId, req.user.id);
  }
}


