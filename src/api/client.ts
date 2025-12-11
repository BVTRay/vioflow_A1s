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
  // 开发环境
  return 'http://localhost:3002/api';
};

const API_BASE_URL = getApiBaseUrl();

// 开发环境下打印 API 地址，便于调试
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // 确保 API 地址正确
    if (!API_BASE_URL || API_BASE_URL.includes('supabase.co')) {
      console.error('⚠️ 错误的 API 地址配置:', API_BASE_URL);
      console.error('请检查 VITE_API_BASE_URL 环境变量');
    }
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器：添加token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器：处理错误
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token过期，清除并跳转登录
          this.setToken(null);
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    // 从localStorage恢复token
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      this.setToken(savedToken);
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

