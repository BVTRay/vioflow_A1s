# Supabase Storage 服务使用指南

## 在模块中使用 Supabase Storage

### 1. 在模块中注入服务

```typescript
import { Module } from '@nestjs/common';
import { StorageModule } from '../common/storage/storage.module';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Module({
  imports: [StorageModule],
  // ...
})
export class YourModule {}
```

### 2. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Injectable()
export class YourService {
  constructor(
    private readonly storageService: SupabaseStorageService,
  ) {}

  async uploadFile(file: Buffer, filename: string) {
    const path = `uploads/${Date.now()}-${filename}`;
    const { url, key } = await this.storageService.uploadFile(
      file,
      path,
      'video/mp4', // MIME type
    );
    
    return { url, key };
  }

  async getFileUrl(path: string) {
    return await this.storageService.getPublicUrl(path);
  }

  async getSignedUrl(path: string) {
    // 生成 1 小时有效的签名 URL
    return await this.storageService.getSignedUrl(path, 3600);
  }

  async deleteFile(path: string) {
    await this.storageService.deleteFile(path);
  }
}
```

### 3. 上传文件示例（使用 Multer）

```typescript
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Controller('api/upload')
export class UploadController {
  constructor(
    private readonly storageService: SupabaseStorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const path = `videos/${Date.now()}-${file.originalname}`;
    const { url, key } = await this.storageService.uploadFile(
      file.buffer,
      path,
      file.mimetype,
    );

    return {
      url,
      key,
      filename: file.originalname,
      size: file.size,
    };
  }
}
```

## 环境变量

确保在环境变量中配置：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=videos
```

## 注意事项

1. **使用 service_role key**：在服务端使用 `SUPABASE_SERVICE_KEY`（service_role key），不要使用 anon key
2. **存储桶权限**：根据需求设置存储桶为公开或私有
3. **文件路径**：建议使用有组织的路径结构，例如：`videos/project-id/filename.mp4`
4. **错误处理**：服务会抛出错误，记得在调用处处理异常

