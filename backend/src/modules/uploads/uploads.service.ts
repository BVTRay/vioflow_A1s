import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadTask, UploadStatus } from './entities/upload-task.entity';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadTask)
    private uploadTaskRepository: Repository<UploadTask>,
  ) {}

  async createTask(userId: string, projectId: string, filename: string, totalSize: number): Promise<UploadTask> {
    const task = this.uploadTaskRepository.create({
      user_id: userId,
      project_id: projectId,
      filename,
      total_size: totalSize,
      uploaded_size: 0,
      status: UploadStatus.PENDING,
    });
    return this.uploadTaskRepository.save(task);
  }

  async updateProgress(taskId: string, uploadedSize: number): Promise<void> {
    await this.uploadTaskRepository.update(taskId, {
      uploaded_size: uploadedSize,
      status: UploadStatus.UPLOADING,
    });
  }

  async completeTask(taskId: string, storageKey: string): Promise<void> {
    await this.uploadTaskRepository.update(taskId, {
      status: UploadStatus.COMPLETED,
      storage_key: storageKey,
    });
  }

  async findAll(userId: string): Promise<UploadTask[]> {
    return this.uploadTaskRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}

