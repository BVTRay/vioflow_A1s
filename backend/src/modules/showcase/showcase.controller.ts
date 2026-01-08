import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ShowcaseService } from './showcase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/showcase/packages')
export class ShowcaseController {
  constructor(private readonly showcaseService: ShowcaseService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.showcaseService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: any, @Request() req) {
    return this.showcaseService.create({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Get('link/:linkId')
  getByLinkId(@Param('linkId') linkId: string) {
    return this.showcaseService.getByLinkId(linkId);
  }

  @Post('link/:linkId/verify-password')
  verifyPassword(@Param('linkId') linkId: string, @Body() body: { password: string }) {
    return this.showcaseService.verifyPassword(linkId, body.password);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.showcaseService.findOne(id);
  }

  @Get(':id/tracking')
  @UseGuards(JwtAuthGuard)
  getTracking(@Param('id') id: string) {
    return this.showcaseService.getTracking(id);
  }

  @Post(':id/generate-link')
  @UseGuards(JwtAuthGuard)
  generateLink(@Param('id') id: string, @Body() config?: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }) {
    return this.showcaseService.generateLink(id, config);
  }

  @Patch(':id/link')
  @UseGuards(JwtAuthGuard)
  updateLink(@Param('id') id: string, @Body() config: {
    linkExpiry?: number;
    requirePassword?: boolean;
    password?: string;
  }) {
    return this.showcaseService.updateLink(id, config);
  }

  @Post(':id/link/toggle')
  @UseGuards(JwtAuthGuard)
  toggleLink(@Param('id') id: string) {
    return this.showcaseService.toggleLink(id);
  }
}

