import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 转换项目数据
        if (Array.isArray(data)) {
          return data.map(item => this.transformItem(item));
        }
        return this.transformItem(data);
      }),
    );
  }

  private transformItem(item: any): any {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const transformed: any = {};

    // 转换字段名：snake_case -> camelCase
    for (const [key, value] of Object.entries(item)) {
      const camelKey = this.toCamelCase(key);
      
      if (value instanceof Date) {
        transformed[camelKey] = value.toISOString();
      } else if (Array.isArray(value)) {
        transformed[camelKey] = value.map(v => this.transformItem(v));
      } else if (value && typeof value === 'object' && !(value instanceof Date)) {
        transformed[camelKey] = this.transformItem(value);
      } else {
        transformed[camelKey] = value;
      }
    }

    // 特殊字段转换
    if (item.project_id) transformed.projectId = item.project_id;
    if (item.user_id) transformed.userId = item.user_id;
    if (item.video_id) transformed.videoId = item.video_id;
    if (item.tag_id) transformed.tagId = item.tag_id;
    if (item.created_at) transformed.createdAt = item.created_at instanceof Date ? item.created_at.toISOString() : item.created_at;
    if (item.updated_at) transformed.updatedAt = item.updated_at instanceof Date ? item.updated_at.toISOString() : item.updated_at;
    if (item.upload_time) transformed.uploadTime = item.upload_time instanceof Date ? item.upload_time.toISOString() : item.upload_time;
    if (item.last_activity_at) transformed.lastActivityAt = item.last_activity_at instanceof Date ? item.last_activity_at.toISOString() : item.last_activity_at;
    if (item.last_opened_at) transformed.lastOpenedAt = item.last_opened_at instanceof Date ? item.last_opened_at.toISOString() : item.last_opened_at;
    if (item.created_date) transformed.createdDate = item.created_date instanceof Date ? item.created_date.toISOString().split('T')[0] : item.created_date;
    if (item.is_case_file !== undefined) transformed.isCaseFile = item.is_case_file;
    if (item.is_main_delivery !== undefined) transformed.isMainDelivery = item.is_main_delivery;
    if (item.is_reference !== undefined) transformed.isReference = item.is_reference;
    if (item.is_completed !== undefined) transformed.isCompleted = item.is_completed;
    if (item.annotation_count !== undefined) transformed.annotationCount = item.annotation_count;
    if (item.completed_at) transformed.completedAt = item.completed_at instanceof Date ? item.completed_at.toISOString() : item.completed_at;
    if (item.timecode) transformed.timecode = item.timecode;
    if (item.screenshot_url) transformed.screenshotUrl = item.screenshot_url;
    if (item.client_name) transformed.clientName = item.client_name;
    if (item.user_type) transformed.userType = item.user_type;
    if (item.team_name) transformed.teamName = item.team_name;
    if (item.storage_url) transformed.url = item.storage_url;
    if (item.storage_url) transformed.storageUrl = item.storage_url;
    if (item.thumbnail_url) transformed.thumbnailUrl = item.thumbnail_url;
    if (item.change_log) transformed.changeLog = item.change_log;
    if (item.aspect_ratio) transformed.aspectRatio = item.aspect_ratio;
    if (item.storage_tier) transformed.storageTier = item.storage_tier;
    if (item.referenced_video_id) transformed.referencedVideoId = item.referenced_video_id;
    if (item.original_filename) transformed.originalFilename = item.original_filename;
    if (item.base_name) transformed.baseName = item.base_name;
    if (item.post_lead) transformed.postLead = item.post_lead;
    if (item.finalized_at) transformed.finalizedAt = item.finalized_at instanceof Date ? item.finalized_at.toISOString() : item.finalized_at;
    if (item.delivered_at) transformed.deliveredAt = item.delivered_at instanceof Date ? item.delivered_at.toISOString() : item.delivered_at;
    if (item.archived_at) transformed.archivedAt = item.archived_at instanceof Date ? item.archived_at.toISOString() : item.archived_at;
    if (item.password_hash) delete transformed.passwordHash; // 不返回密码哈希
    if (item.video_tags) {
      transformed.tags = item.video_tags.map((vt: any) => vt.tag?.name).filter(Boolean);
      transformed.tagIds = item.video_tags.map((vt: any) => vt.tag_id).filter(Boolean);
    }
    if (item.size) {
      // 转换字节为可读格式
      const sizeInMB = item.size / (1024 * 1024);
      if (sizeInMB >= 1024) {
        transformed.size = `${(sizeInMB / 1024).toFixed(1)} GB`;
      } else {
        transformed.size = `${sizeInMB.toFixed(1)} MB`;
      }
    }
    if (item.duration) {
      // 转换秒数为时间格式
      const hours = Math.floor(item.duration / 3600);
      const minutes = Math.floor((item.duration % 3600) / 60);
      const seconds = item.duration % 60;
      if (hours > 0) {
        transformed.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        transformed.duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    if (item.members) {
      transformed.team = item.members.map((m: any) => m.user?.name || m.user_id).filter(Boolean);
    }
    
    // 转换通知数据
    if (item.related_type) {
      transformed.relatedType = item.related_type;
    }
    if (item.related_id) {
      transformed.relatedId = item.related_id;
    }
    // 为通知添加时间字段（如果不存在）
    if (item.created_at && !item.time) {
      const date = item.created_at instanceof Date ? item.created_at : new Date(item.created_at);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) transformed.time = '刚刚';
      else if (minutes < 60) transformed.time = `${minutes}分钟前`;
      else if (hours < 24) transformed.time = `${hours}小时前`;
      else if (days === 1) transformed.time = '昨天';
      else if (days < 7) transformed.time = `${days}天前`;
      else transformed.time = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    return transformed;
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}

