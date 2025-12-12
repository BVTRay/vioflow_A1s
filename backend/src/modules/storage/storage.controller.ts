import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('team/:teamId')
  getUsage(@Param('teamId') teamId: string, @Request() req) {
    return this.storageService.getUsage(teamId, req.user.id);
  }

  @Post('team/:teamId/recalculate')
  recalculate(@Param('teamId') teamId: string, @Request() req) {
    return this.storageService.recalculate(teamId, req.user.id);
  }
}

