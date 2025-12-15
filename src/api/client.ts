import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// 根据环境自动选择 API 地址
const getApiBaseUrl = () => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 生产环境：使用相对路径或配置的 API 地址
  if (import.meta.env.PROD) {
    // 生产环境应该使用完整的 API 地址，需要在 Vercel 环境变量中配置
    // 例如：https://api.vioflow.cc/api
    return import.meta.env.VITE_API_BASE_URL || 'https://api.vioflow.cc/api';
  }
  // 开发环境：根据当前访问的域名动态调整 API 地址
  const hostname = window.location.hostname;
  const port = '3002';
  
  // 如果是 localhost 或 127.0.0.1，使用 localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}/api`;
  }
  
  // 如果是内网 IP（192.168.x.x 或 172.x.x.x），使用相同的 IP
  if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
    return `http://${hostname}:${port}/api`;
  }
  
  // 默认使用 localhost
  return `http://localhost:${port}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// 打印 API 地址，便于调试（生产环境也打印，方便排查问题）
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🌐 Environment:', import.meta.env.MODE);
console.log('🌐 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '未设置');

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private teamId: string | null = null;

  constructor() {
    // 确保 API 地址正确
    if (!API_BASE_URL) {
      console.error('❌ API 地址未配置！');
      console.error('请在 Vercel 环境变量中设置 VITE_API_BASE_URL');
      console.error('例如: VITE_API_BASE_URL=https://你的railway域名.railway.app/api');
    } else if (API_BASE_URL.includes('supabase.co')) {
      console.error('❌ 错误的 API 地址配置:', API_BASE_URL);
      console.error('API 地址不应指向 Supabase，应该指向 Railway 后端');
      console.error('请检查 Vercel 环境变量中的 VITE_API_BASE_URL');
    } else if (import.meta.env.PROD && API_BASE_URL === 'https://api.vioflow.cc/api') {
      console.warn('⚠️ 使用默认 API 地址，可能不正确');
      console.warn('建议在 Vercel 环境变量中设置 VITE_API_BASE_URL');
    }
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：添加token和team_id
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        // 添加开发者模式标记（如果处于开发者模式）
        if (typeof window !== 'undefined' && localStorage.getItem('dev_mode') === 'true') {
          config.headers['X-Dev-Mode'] = 'true';
        }
        // 添加 team_id 到请求头（如果存在）
        // 登录和认证相关的请求不需要 teamId，所以不显示警告
        const isAuthRequest = config.url?.includes('/auth/') || config.url?.includes('/login');
        if (this.teamId) {
          config.headers['X-Team-Id'] = this.teamId;
          console.log(`📤 API 请求 [${config.method?.toUpperCase()} ${config.url}]: 添加 teamId=${this.teamId}`);
        } else if (!isAuthRequest) {
          // 只有非认证请求才显示警告
          console.warn(`⚠️ API 请求 [${config.method?.toUpperCase()} ${config.url}]: 没有 teamId`);
        }
        // 同时添加到查询参数（某些 API 可能需要）
        // 如果已经有 params，添加到现有 params；如果没有，创建新的 params
        if (this.teamId) {
          if (config.params) {
            // 如果已经有 params，添加 teamId（如果还没有）
            if (!config.params.teamId) {
              config.params.teamId = this.teamId;
            }
          } else {
            // 如果没有 params，创建新的
            config.params = { teamId: this.teamId };
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
          console.error('❌ API 错误响应:', {
            status: error.response.status,
            statusText: error.response.statusText,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response.data,
          });
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.error('❌ API 请求失败（无响应）:', {
            url: error.config?.url,
            method: error.config?.method,
            message: error.message,
          });
          console.error('可能的原因:');
          console.error('1. 后端服务未运行或无法访问');
          console.error('2. API 地址配置错误 (当前:', API_BASE_URL, ')');
          console.error('3. CORS 配置问题');
          console.error('4. 网络连接问题');
        } else {
          // 请求配置出错
          console.error('❌ API 请求配置错误:', error.message);
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

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    return this.client.request<T>(config);
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

