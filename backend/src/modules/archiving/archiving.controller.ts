import { Controller, Get, UseGuards } from '@nestjs/common';
import { ArchivingService } from './archiving.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/archiving')
@UseGuards(JwtAuthGuard)
export class ArchivingController {
  constructor(private readonly archivingService: ArchivingService) {}

  @Get('tasks')
  findAll() {
    return this.archivingService.findAll();
  }
}

