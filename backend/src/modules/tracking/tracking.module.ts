import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { ViewTracking } from './entities/view-tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ViewTracking])],
  controllers: [TrackingController],
  providers: [TrackingService],
})
export class TrackingModule {}

