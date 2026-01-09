// pages/agreement/index.js
const apiClient = require('../../utils/api');
const { api } = require('../../utils/api');

Page({
  data: {
    agreed: false,
    scanId: '',
    loading: false,
  },

  onLoad(options) {
    // 从扫码页面传递的参数
    if (options.scanId) {
      this.setData({
        scanId: options.scanId,
      });
    }
  },

  // 勾选协议
  onAgreeChange(e) {
    this.setData({
      agreed: e.detail.value.length > 0,
    });
  },

  // 微信手机号快捷登录（通过 button 的 getPhoneNumber 事件触发）
  async quickLoginWithPhone(e) {
    const { agreed, scanId, loading } = this.data;

    if (loading) return;

    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
      });
      return;
    }

    // 检查是否获取到手机号
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({
        title: '获取手机号失败，请使用手动输入',
        icon: 'none',
      });
      // 跳转到手动输入页面
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/phone-login/index?scanId=${scanId}`,
        });
      }, 1500);
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      // 获取到的手机号信息（加密的）
      const { encryptedData, iv } = e.detail;

      // 调用后端接口解密手机号并登录
      const result = await api.auth.quickLoginWithWechatPhone(scanId, encryptedData, iv);

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
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      
      console.error('快捷登录失败:', error);
      
      // 如果快捷登录失败，提示用户使用手动输入
      wx.showModal({
        title: '快捷登录失败',
        content: error.message || '请使用手动输入手机号登录',
        showCancel: true,
        confirmText: '手动输入',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({
              url: `/pages/phone-login/index?scanId=${scanId}`,
            });
          }
        },
      });
    }
  },

  // 手动输入手机号登录
  goToPhoneLogin() {
    const { agreed, scanId } = this.data;

    if (!agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none',
      });
      return;
    }

    wx.redirectTo({
      url: `/pages/phone-login/index?scanId=${scanId}`,
    });
  },

  // 打开用户协议（占位）
  openAgreement() {
    wx.showToast({
      title: '用户协议页面开发中',
      icon: 'none',
    });
  },

  // 打开隐私政策（占位）
  openPrivacy() {
    wx.showToast({
      title: '隐私政策页面开发中',
      icon: 'none',
    });
  },
});

