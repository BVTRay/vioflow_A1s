// app.js
App({
  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      // 验证 token 是否有效
      this.checkAuth();
    }
  },

  async checkAuth() {
    try {
      const { api } = require('./utils/api');
      const userInfo = await api.auth.getMe();
      if (userInfo) {
        this.globalData.user = userInfo;
      }
    } catch (error) {
      // Token 无效，清除
      wx.removeStorageSync('token');
      this.globalData.user = null;
    }
  },

  globalData: {
    user: null,
    apiBaseUrl: require('./utils/config').apiBaseUrl,
  },
});

