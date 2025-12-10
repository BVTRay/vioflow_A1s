import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { Delivery } from './entities/delivery.entity';
import { DeliveryFolder } from './entities/delivery-folder.entity';
import { DeliveryFile } from './entities/delivery-file.entity';
import { DeliveryPackage } from './entities/delivery-package.entity';
import { DeliveryPackageFile } from './entities/delivery-package-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Delivery, DeliveryFolder, DeliveryFile, DeliveryPackage, DeliveryPackageFile])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}

