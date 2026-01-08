import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';
import { ShowcasePackage } from './entities/showcase-package.entity';
import { ShowcasePackageVideo } from './entities/showcase-package-video.entity';
import { ShareLink } from '../shares/entities/share-link.entity';
import { SharesModule } from '../shares/shares.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShowcasePackage, ShowcasePackageVideo, ShareLink]),
    SharesModule,
  ],
  controllers: [ShowcaseController],
  providers: [ShowcaseService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}

