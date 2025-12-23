import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from './supabase-storage.service';
import { R2StorageService } from './r2-storage.service';
import { IStorageService } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    SupabaseStorageService,
    R2StorageService,
    {
      provide: 'IStorageService',
      useFactory: (configService: ConfigService, supabaseService: SupabaseStorageService, r2Service: R2StorageService) => {
        // 根据环境变量选择存储服务
        // 如果配置了 R2 相关环境变量，优先使用 R2
        const useR2 = configService.get<string>('STORAGE_TYPE') === 'r2' || 
                     (configService.get<string>('R2_ACCESS_KEY_ID') && 
                      configService.get<string>('R2_SECRET_ACCESS_KEY') && 
                      configService.get<string>('R2_ENDPOINT'));

        if (useR2) {
          console.log('[StorageModule] 使用 R2 存储服务');
          return r2Service;
        } else {
          console.log('[StorageModule] 使用 Supabase 存储服务');
          return supabaseService;
        }
      },
      inject: [ConfigService, SupabaseStorageService, R2StorageService],
    },
  ],
  exports: ['IStorageService', SupabaseStorageService, R2StorageService],
})
export class StorageModule {}

