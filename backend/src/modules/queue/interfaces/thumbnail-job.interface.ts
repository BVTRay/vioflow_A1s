export interface ThumbnailJobData {
  videoId: string;
  videoKey: string; // 从存储中读取视频文件
  timestamp?: number;
}

export interface ThumbnailJobResult {
  url: string;
  key: string;
  duration?: number;
  width?: number;
  height?: number;
}

