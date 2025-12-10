import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get('popular')
  findPopular(@Query('limit') limit?: number) {
    return this.tagsService.findPopular(limit ? parseInt(limit.toString()) : 10);
  }

  @Get('suggestions')
  getSuggestions(@Query('q') query?: string) {
    return this.tagsService.getSuggestions(query);
  }

  @Post()
  create(@Body() body: { name: string; category?: string }) {
    return this.tagsService.create(body.name, body.category);
  }
}

