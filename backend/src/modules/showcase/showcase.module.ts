import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';
import { ShowcasePackage } from './entities/showcase-package.entity';
import { ShowcasePackageVideo } from './entities/showcase-package-video.entity';
import { SharesModule } from '../shares/shares.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShowcasePackage, ShowcasePackageVideo]),
    SharesModule,
  ],
  controllers: [ShowcaseController],
  providers: [ShowcaseService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}

