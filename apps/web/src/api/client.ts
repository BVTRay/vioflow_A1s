import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

// 根据环境自动选择 API 地址
export const getApiBaseUrl = (): string => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 开发环境：如果没有配置，尝试从当前hostname推断
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // 端口号可以通过环境变量配置，默认使用 3002
    const port = import.meta.env.VITE_API_PORT || '3002';
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      logger.warn('⚠️ 未配置 VITE_API_BASE_URL，使用默认开发地址');
      return `http://localhost:${port}/api`;
    }
    
    // 如果是内网 IP，使用相同的 IP（仅开发环境）
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(hostname)) {
      logger.warn('⚠️ 未配置 VITE_API_BASE_URL，使用当前IP地址');
      return `http://${hostname}:${port}/api`;
    }
  }
  
  // 生产环境必须配置VITE_API_BASE_URL
  logger.error('❌ 未配置 VITE_API_BASE_URL 环境变量');
  logger.error('请在环境变量中设置 VITE_API_BASE_URL');
  throw new Error('API base URL not configured. Please set VITE_API_BASE_URL environment variable.');
};

let API_BASE_URL: string;
try {
  API_BASE_URL = getApiBaseUrl();
  // 仅在开发环境打印详细日志
  logger.log('🌐 API Base URL:', API_BASE_URL);
  logger.log('🌐 Environment:', import.meta.env.MODE);
  logger.log('🌐 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '未设置');
} catch (error) {
  // 如果获取失败，在生产环境抛出错误，开发环境使用默认值
  if (import.meta.env.PROD) {
    throw error;
  }
  // 开发环境使用默认值
  API_BASE_URL = 'http://localhost:3002/api';
  logger.error('❌ 获取 API 地址失败，使用默认值:', API_BASE_URL);
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private teamId: string | null = null;

  constructor() {
    // 确保 API 地址正确
    if (!API_BASE_URL) {
      logger.error('❌ API 地址未配置！');
      logger.error('请在 Vercel 环境变量中设置 VITE_API_BASE_URL');
      logger.error('例如: VITE_API_BASE_URL=https://你的railway域名.railway.app/api');
    } else if (API_BASE_URL.includes('supabase.co')) {
      logger.error('❌ 错误的 API 地址配置:', API_BASE_URL);
      logger.error('API 地址不应指向 Supabase，应该指向本地后端');
      logger.error('请检查环境变量中的 VITE_API_BASE_URL');
    } else if (import.meta.env.PROD && API_BASE_URL === 'https://api.vioflow.cc/api') {
      logger.warnImportant('⚠️ 使用默认 API 地址，可能不正确');
      logger.warnImportant('建议在 Vercel 环境变量中设置 VITE_API_BASE_URL');
    }
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 600000, // 10分钟超时（用于大文件上传）
      withCredentials: true, // 允许携带凭证（用于 CORS）
    });

    // 请求拦截器：添加token和team_id
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        // 仅在开发环境且明确启用时才添加开发者模式标记
        if (typeof window !== 'undefined' && import.meta.env.DEV && localStorage.getItem('dev_mode') === 'true') {
          config.headers['X-Dev-Mode'] = 'true';
        }
        // 添加 team_id 到请求头（如果存在）
        // 登录和认证相关的请求不需要 teamId，所以不显示警告，也不添加 teamId
        const isAuthRequest = config.url?.includes('/auth/') || config.url?.includes('/login');
        // 开发者后台接口（admin/all）不需要 teamId
        const isAdminRequest = config.url?.includes('/admin/');
        // 检查是否明确跳过 teamId（通过 skipTeamId 标记）
        const skipTeamId = (config as any).skipTeamId === true;
        
        // 只有非认证请求且非管理员请求且未明确跳过时才添加 teamId
        if (!isAuthRequest && !isAdminRequest && !skipTeamId) {
          if (this.teamId) {
            config.headers['X-Team-Id'] = this.teamId;
            logger.log(`📤 API 请求 [${config.method?.toUpperCase()} ${config.url}]: 添加 teamId=${this.teamId}`);
            // 同时添加到查询参数（某些 API 可能需要）
            // 如果已经有 params，添加到现有 params；如果没有，创建新的 params
            if (config.params) {
              // 如果已经有 params，添加 teamId（如果还没有）
              if (!config.params.teamId) {
                config.params.teamId = this.teamId;
              }
            } else {
              // 如果没有 params，创建新的
              config.params = { teamId: this.teamId };
            }
          } else {
            // 只有非认证请求才显示警告
            logger.warn(`⚠️ API 请求 [${config.method?.toUpperCase()} ${config.url}]: 没有 teamId`);
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器：处理错误
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // 详细的错误日志
        if (error.response) {
          // 服务器返回了错误响应
          logger.error('❌ API 错误响应:', {
            status: error.response.status,
            statusText: error.response.statusText,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response.data,
          });
        } else if (error.request) {
          // 请求已发出但没有收到响应
          logger.error('❌ API 请求失败（无响应）:', {
            url: error.config?.url,
            method: error.config?.method,
            message: error.message,
            baseURL: error.config?.baseURL,
            fullURL: error.config?.baseURL + error.config?.url,
            hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
          });
          logger.debug('可能的原因:');
          logger.debug('1. 后端服务未运行或无法访问');
          logger.debug('2. API 地址配置错误 (当前:', API_BASE_URL, ')');
          logger.debug('3. CORS 配置问题');
          logger.debug('4. 网络连接问题');
          logger.debug('5. 如果通过 IP 访问前端，请确保 API 地址也使用相同的 IP');
          logger.debug('   当前前端地址:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
          logger.debug('   当前 API 地址:', API_BASE_URL);
        } else {
          // 请求配置出错
          logger.error('❌ API 请求配置错误:', error.message);
        }
        
        if (error.response?.status === 401) {
          // Token过期，清除并跳转登录
          this.setToken(null);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // 从localStorage恢复token和team_id
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.setToken(savedToken);
    }
    const savedTeamId = localStorage.getItem('current_team_id');
    if (savedTeamId) {
      this.teamId = savedTeamId;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  setTeamId(teamId: string | null) {
    this.teamId = teamId;
    if (teamId) {
      localStorage.setItem('current_team_id', teamId);
    } else {
      localStorage.removeItem('current_team_id');
    }
  }

  getTeamId(): string | null {
    return this.teamId;
  }

  getBaseURL(): string {
    return API_BASE_URL;
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    // 响应拦截器已经返回了 response.data，所以这里直接返回 response
    const response = await this.client.request<T>(config);
    return response as T;
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // 响应拦截器已经返回了 response.data，所以这里直接返回 response
    const response = await this.client.get<T>(url, config);
    return response as T;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // 响应拦截器已经返回了 response.data，所以这里直接返回 response
    const response = await this.client.post<T>(url, data, config);
    return response as T;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    // 响应拦截器已经返回了 response.data，所以这里直接返回 response
    const response = await this.client.patch<T>(url, data, config);
    return response as T;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    // 响应拦截器已经返回了 response.data，所以这里直接返回 response
    const response = await this.client.delete<T>(url, config);
    return response as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

