import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { StorageUsage } from './entities/storage-usage.entity';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/entities/team-member.entity';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageUsage)
    private storageUsageRepository: Repository<StorageUsage>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    private dataSource: DataSource,
  ) {}

  /**
   * 获取团队的存储使用情况
   */
  async getUsage(teamId: string, userId: string): Promise<StorageUsage> {
    // 检查权限
    await this.teamsService.findOne(teamId, userId);

    let usage = await this.storageUsageRepository.findOne({
      where: { team_id: teamId },
    });

    if (!usage) {
      // 如果不存在，创建默认记录
      usage = this.storageUsageRepository.create({
        team_id: teamId,
        total_size: 0,
        standard_size: 0,
        cold_size: 0,
        file_count: 0,
      });
      usage = await this.storageUsageRepository.save(usage);
    }

    return usage;
  }

  /**
   * 重新计算存储使用情况（管理员权限）
   */
  async recalculate(teamId: string, userId: string): Promise<StorageUsage> {
    // 检查权限（只有管理员和超级管理员可以重新计算）
    const role = await this.teamsService.getUserRole(teamId, userId);
    if (role !== TeamRole.SUPER_ADMIN && role !== TeamRole.ADMIN) {
      throw new ForbiddenException('无权重新计算存储统计');
    }

    // 计算videos表的存储（排除已删除的文件）
    const videoStats = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(v.size), 0)', 'total_size')
      .addSelect(
        "COALESCE(SUM(CASE WHEN v.storage_tier = 'standard' THEN v.size ELSE 0 END), 0)",
        'standard_size',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN v.storage_tier = 'cold' THEN v.size ELSE 0 END), 0)",
        'cold_size',
      )
      .addSelect('COUNT(v.id)', 'file_count')
      .from('videos', 'v')
      .innerJoin('projects', 'p', 'p.id = v.project_id')
      .where('p.team_id = :teamId', { teamId })
      .andWhere('v.deleted_at IS NULL') // 排除已删除的文件
      .getRawOne();

    // 计算delivery_files表的存储
    const deliveryStats = await this.dataSource
      .createQueryBuilder()
      .select('COALESCE(SUM(df.size), 0)', 'total_size')
      .from('delivery_files', 'df')
      .innerJoin('deliveries', 'd', 'd.id = df.delivery_id')
      .innerJoin('projects', 'p', 'p.id = d.project_id')
      .where('p.team_id = :teamId', { teamId })
      .getRawOne();

    // 使用 Decimal 类型进行金额计算，避免精度丢失
    const videoTotalSize = new Decimal(videoStats?.total_size || '0');
    const videoStandardSize = new Decimal(videoStats?.standard_size || '0');
    const videoColdSize = new Decimal(videoStats?.cold_size || '0');
    const videoFileCount = new Decimal(videoStats?.file_count || '0');
    
    const deliveryTotalSize = new Decimal(deliveryStats?.total_size || '0');
    const deliveryFileCount = new Decimal(deliveryStats?.file_count || '0');
    
    const totalSize = videoTotalSize.plus(deliveryTotalSize).toNumber();
    const standardSize = videoStandardSize.plus(deliveryTotalSize).toNumber();
    const coldSize = videoColdSize.toNumber();
    const fileCount = videoFileCount.plus(deliveryFileCount).toNumber();

    let usage = await this.storageUsageRepository.findOne({
      where: { team_id: teamId },
    });

    if (!usage) {
      usage = this.storageUsageRepository.create({
        team_id: teamId,
        total_size: totalSize,
        standard_size: standardSize,
        cold_size: coldSize,
        file_count: fileCount,
      });
    } else {
      usage.total_size = totalSize;
      usage.standard_size = standardSize;
      usage.cold_size = coldSize;
      usage.file_count = fileCount;
    }

    return this.storageUsageRepository.save(usage);
  }
}

