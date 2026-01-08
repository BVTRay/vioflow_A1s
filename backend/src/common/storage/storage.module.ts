import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from './supabase-storage.service';
import { R2StorageService } from './r2-storage.service';
import { LocalStorageService } from './local-storage.service';
import { IStorageService } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    SupabaseStorageService,
    R2StorageService,
    LocalStorageService,
    {
      provide: 'IStorageService',
      useFactory: (
        configService: ConfigService,
        supabaseService: SupabaseStorageService,
        r2Service: R2StorageService,
        localService: LocalStorageService,
      ) => {
        // 根据环境变量选择存储服务
        const storageType = configService.get<string>('STORAGE_TYPE', 'local');

        // 优先使用本地存储
        if (storageType === 'local') {
          console.log('[StorageModule] 使用本地存储服务');
          return localService;
        }

        // 如果配置了 R2 相关环境变量，使用 R2
        const useR2 = storageType === 'r2' || 
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
      inject: [ConfigService, SupabaseStorageService, R2StorageService, LocalStorageService],
    },
  ],
  exports: ['IStorageService', SupabaseStorageService, R2StorageService, LocalStorageService],
})
export class StorageModule {}

