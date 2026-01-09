// pages/login/index.js
const apiClient = require('../../utils/api');
const { api } = require('../../utils/api');

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    loginType: 'phone', // 'phone' 或 'wechat'
    sending: false,
    loading: false,
  },

  onLoad() {
    // 检查是否已登录
    const token = apiClient.getToken();
    if (token) {
      this.checkAuth();
    }
  },

  // 检查登录状态
  async checkAuth() {
    try {
      const userInfo = await api.auth.getMe();
      if (userInfo) {
        // 已登录，跳转到首页
        wx.switchTab({
          url: '/pages/home/index',
        });
      }
    } catch (error) {
      // Token 无效，清除
      apiClient.setToken(null);
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value,
    });
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({
      code: e.detail.value,
    });
  },

  // 发送验证码
  async sendCode() {
    const { phone, sending, countdown } = this.data;

    if (sending || countdown > 0) {
      return;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none',
      });
      return;
    }

    this.setData({ sending: true });

    try {
      const result = await api.auth.sendSms(phone);
      
      wx.showToast({
        title: '验证码已发送',
        icon: 'success',
      });

      // 开始倒计时
      let countdown = 60;
      this.setData({ countdown, sending: false });

      const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(timer);
          this.setData({ countdown: 0 });
        } else {
          this.setData({ countdown });
        }
      }, 1000);

      // 开发环境显示验证码
      if (result.code) {
        console.log('验证码:', result.code);
        wx.showModal({
          title: '开发模式',
          content: `验证码: ${result.code}`,
          showCancel: false,
        });
      }
    } catch (error) {
      this.setData({ sending: false });
      wx.showToast({
        title: error.message || '发送失败',
        icon: 'none',
      });
    }
  },

  // 手机号登录
  async phoneLogin() {
    const { phone, code, loading } = this.data;

    if (loading) {
      return;
    }

    if (!phone || !code) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const result = await api.auth.phoneLogin(phone, code);
      
      // 保存 token
      apiClient.setToken(result.access_token);

      // 更新全局用户信息
      const app = getApp();
      app.globalData.user = result.user;

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index',
        });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      });
    }
  },

  // 微信登录
  async wechatLogin() {
    const { loading } = this.data;

    if (loading) {
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      // 获取微信登录 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });

      if (!loginRes.code) {
        throw new Error('获取微信登录凭证失败');
      }

      // 调用后端登录接口
      const result = await api.auth.wechatLogin(loginRes.code);

      // 保存 token
      apiClient.setToken(result.access_token);

      // 更新全局用户信息
      const app = getApp();
      app.globalData.user = result.user;

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index',
        });
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      });
    }
  },
});






