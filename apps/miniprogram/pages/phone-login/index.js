// pages/phone-login/index.js
const apiClient = require('../../utils/api');
const { api } = require('../../utils/api');

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    sending: false,
    loading: false,
    scanId: '',
    quickLogin: false, // 是否来自快捷登录
  },

  onLoad(options) {
    // 从协议页面传递的参数
    if (options.scanId) {
      this.setData({
        scanId: options.scanId,
      });
    }
    if (options.quickLogin === 'true') {
      this.setData({
        quickLogin: true,
      });
    }
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  // 发送验证码
  async sendCode() {
    const { phone, sending, countdown } = this.data;

    if (sending || countdown > 0) {
      return;
    }

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
    const { phone, code, scanId, loading } = this.data;

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
      // 如果有扫码ID，说明是从扫码登录流程来的
      if (scanId) {
        // 调用确认扫码登录接口（使用短信验证码）
        const result = await api.auth.confirmQrCodeLogin(scanId, phone, code);

        apiClient.setToken(result.access_token);
        const app = getApp();
        app.globalData.user = result.user;

        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index',
          });
        }, 1500);
      } else {
        // 普通手机号登录
        const result = await api.auth.phoneLogin(phone, code);
        apiClient.setToken(result.access_token);
        const app = getApp();
        app.globalData.user = result.user;

        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/index',
          });
        }, 1500);
      }
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

