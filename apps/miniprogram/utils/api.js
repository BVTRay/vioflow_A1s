// utils/api.js
const app = getApp();

class ApiClient {
  constructor() {
    this.baseURL = app.globalData.apiBaseUrl || 'https://your-api-domain.com/api';
    this.token = wx.getStorageSync('token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      wx.setStorageSync('token', token);
    } else {
      wx.removeStorageSync('token');
    }
  }

  getToken() {
    return this.token || wx.getStorageSync('token');
  }

  request(options) {
    return new Promise((resolve, reject) => {
      const token = this.getToken();
      
      wx.request({
        url: `${this.baseURL}${options.url}`,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.header,
        },
        success: (res) => {
          console.log('[API] 响应状态码:', res.statusCode);
          console.log('[API] 响应数据:', res.data);
          
          // 接受所有 2xx 状态码为成功
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            // Token 无效，清除并跳转到登录页
            this.setToken(null);
            wx.redirectTo({
              url: '/pages/login/index',
            });
            reject(new Error('未授权，请重新登录'));
          } else {
            console.error('[API] 请求失败，状态码:', res.statusCode, '数据:', res.data);
            const errorMsg = res.data?.message || res.data?.error || '请求失败';
            reject(new Error(errorMsg));
          }
        },
        fail: (error) => {
          console.error('API 请求失败:', error);
          reject(new Error(error.errMsg || '网络请求失败'));
        },
      });
    });
  }

  get(url, data) {
    return this.request({ url, method: 'GET', data });
  }

  post(url, data) {
    return this.request({ url, method: 'POST', data });
  }

  put(url, data) {
    return this.request({ url, method: 'PUT', data });
  }

  delete(url, data) {
    return this.request({ url, method: 'DELETE', data });
  }
}

// 创建单例
const apiClient = new ApiClient();

// API 方法封装
const api = {
  // 认证相关
  auth: {
    // 发送短信验证码
    sendSms(phone) {
      return apiClient.post('/auth/send-sms', { phone });
    },

    // 手机号登录
    phoneLogin(phone, code) {
      return apiClient.post('/auth/phone-login', { phone, code });
    },

    // 微信登录
    wechatLogin(code) {
      return apiClient.post('/auth/wechat-login', { code });
    },

    // 获取当前用户信息
    getMe() {
      return apiClient.get('/auth/me');
    },

    // 登出
    logout() {
      return apiClient.post('/auth/logout');
    },

    // 扫码登录相关
    scanQrCode(scanId, code) {
      return apiClient.post('/auth/wechat-qrcode/scan', { scanId, code });
    },

    confirmQrCodeLogin(scanId, phone = null, smsCode = null) {
      const data = { scanId };
      if (phone && smsCode) {
        data.phone = phone;
        data.smsCode = smsCode;
      }
      return apiClient.post('/auth/wechat-qrcode/confirm', data);
    },

    // 微信手机号快捷登录
    quickLoginWithWechatPhone(scanId, encryptedData, iv) {
      return apiClient.post('/auth/wechat-qrcode/quick-login', {
        scanId,
        encryptedData,
        iv,
      });
    },
  },
};

module.exports = apiClient;
module.exports.api = api;

