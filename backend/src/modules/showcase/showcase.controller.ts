import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/showcase/packages')
@UseGuards(JwtAuthGuard)
export class ShowcaseController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Get()
  findAll() {
    return this.showcaseService.findAll();
  }

  @Post()
  create(@Body() body: any, @Request() req) {
    return this.showcaseService.create({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.showcaseService.findOne(id);
  }

  @Get(':id/tracking')
  getTracking(@Param('id') id: string) {
    return this.showcaseService.getTracking(id);
  }

  @Post(':id/generate-link')
  generateLink(@Param('id') id: string, @Body() config?: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }) {
    return this.showcaseService.generateLink(id, config);
  }

  @Patch(':id/link')
  updateLink(@Param('id') id: string, @Body() config: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }) {
    return this.showcaseService.updateLink(id, config);
  }

  @Post(':id/link/toggle')
  toggleLink(@Param('id') id: string) {
    return this.showcaseService.toggleLink(id);
  }
}

