import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivingController } from './archiving.controller';
import { ArchivingService } from './archiving.service';
import { ArchivingTask } from './entities/archiving-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArchivingTask])],
  controllers: [ArchivingController],
  providers: [ArchivingService],
})
export class ArchivingModule {}

