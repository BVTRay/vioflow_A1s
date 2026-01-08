import { Controller, Get, Post, Patch, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { CreateDeliveryPackageDto } from './dto/create-delivery-package.dto';

// Deliveries端点需要更高的限流阈值,因为前端会为每个项目请求交付数据
// 设置为60秒300次,比全局限流(60秒200次)更宽松
@Controller('api/deliveries')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 300, ttl: 60000 } }) // 单独配置deliveries端点的限流
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(':projectId')
  findByProjectId(@Param('projectId') projectId: string) {
    console.log(`[DeliveriesController] GET /api/deliveries/${projectId}`);
    return this.deliveriesService.findByProjectId(projectId);
  }

  @Patch(':projectId')
  async update(@Param('projectId') projectId: string, @Body() body: any) {
    const dto = await this.validateDto(UpdateDeliveryDto, body);
    return this.deliveriesService.update(projectId, dto);
  }

  @Post(':projectId/complete')
  completeDelivery(@Param('projectId') projectId: string) {
    return this.deliveriesService.completeDelivery(projectId);
  }

  @Get(':projectId/folders')
  getFolders(@Param('projectId') projectId: string) {
    return this.deliveriesService.getFolders(projectId);
  }

  @Get(':projectId/packages')
  getPackages(@Param('projectId') projectId: string) {
    return this.deliveriesService.getPackages(projectId);
  }

  @Post(':projectId/packages')
  async createPackage(@Param('projectId') projectId: string, @Body() body: any) {
    const dto = await this.validateDto(CreateDeliveryPackageDto, body);
    return this.deliveriesService.createPackage(projectId, dto);
  }

  private async validateDto<T extends object>(cls: ClassConstructor<T>, payload: any): Promise<T> {
    const dto = plainToInstance(cls, payload);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return dto;
  }
}

