import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchivingTask } from './entities/archiving-task.entity';

@Injectable()
export class ArchivingService {
  constructor(
    @InjectRepository(ArchivingTask)
    private archivingTaskRepository: Repository<ArchivingTask>,
  ) {}

  async findAll(): Promise<ArchivingTask[]> {
    return this.archivingTaskRepository.find({
      order: { created_at: 'DESC' },
    });
  }
}

