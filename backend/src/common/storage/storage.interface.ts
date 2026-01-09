/**
 * 存储服务接口
 * 所有存储服务实现都应该遵循此接口
 */
export interface IStorageService {
  /**
   * 上传文件
   * @param file 文件内容（Buffer 或 Uint8Array）
   * @param path 存储路径
   * @param contentType 文件 MIME 类型
   * @returns 返回文件的 URL 和 key
   */
  uploadFile(
    file: Buffer | Uint8Array,
    path: string,
    contentType?: string,
  ): Promise<{ url: string; key: string }>;

  /**
   * 删除文件
   * @param path 文件路径
   */
  deleteFile(path: string): Promise<void>;

  /**
   * 下载文件
   * @param path 文件路径
   * @returns 文件内容（Buffer）或 null
   */
  downloadFile(path: string): Promise<Buffer | null>;

  /**
   * 获取签名 URL（用于私有存储桶）
   * @param path 文件路径
   * @param expiresIn 过期时间（秒），默认 3600
   * @returns 签名 URL
   */
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * 获取公共 URL（用于公开存储桶）
   * @param path 文件路径
   * @returns 公共 URL
   */
  getPublicUrl(path: string): Promise<string>;

  /**
   * 列出文件
   * @param folder 文件夹路径（可选）
   * @returns 文件路径列表
   */
  listFiles(folder?: string): Promise<string[]>;
}




















