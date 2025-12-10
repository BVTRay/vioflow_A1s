import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.sharesService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: { 
    type: string; 
    videoId?: string; 
    projectId?: string;
    allowDownload?: boolean;
    hasPassword?: boolean;
    password?: string;
    expiresAt?: string;
    justification?: string;
  }, @Request() req) {
    return this.sharesService.createShareLink({
      ...body,
      createdBy: req.user.id,
    });
  }

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.sharesService.findByToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.sharesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.sharesService.toggle(id);
  }
}

