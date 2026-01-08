import { Module } from '@nestjs/common';
import { StorageServeController } from './storage-serve.controller';

@Module({
  controllers: [StorageServeController],
})
export class StorageServeModule {}











