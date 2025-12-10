import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViewTracking } from './entities/view-tracking.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(ViewTracking)
    private trackingRepository: Repository<ViewTracking>,
  ) {}

  async updateProgress(data: {
    packageId: string;
    videoId: string;
    progress: number;
    durationWatched: number;
    viewerIp: string;
    userAgent: string;
  }): Promise<ViewTracking> {
    let tracking = await this.trackingRepository.findOne({
      where: {
        package_id: data.packageId,
        video_id: data.videoId,
      },
    });

    if (!tracking) {
      tracking = this.trackingRepository.create(data);
    } else {
      tracking.progress = data.progress;
      tracking.duration_watched = data.durationWatched;
      tracking.last_updated_at = new Date();
    }

    return this.trackingRepository.save(tracking);
  }
}

