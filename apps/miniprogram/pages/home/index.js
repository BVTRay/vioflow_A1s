// pages/home/index.js
const apiClient = require('../../utils/api');
const { api } = require('../../utils/api');

Page({
  data: {
    user: null,
    loading: true,
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    // 每次显示页面时刷新用户信息
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    const token = apiClient.getToken();
    if (!token) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/index',
      });
      return;
    }

    try {
      const userInfo = await api.auth.getMe();
      const app = getApp();
      app.globalData.user = userInfo;
      
      this.setData({
        user: userInfo,
        loading: false,
      });
    } catch (error) {
      // Token 无效，清除并跳转登录
      apiClient.setToken(null);
      wx.redirectTo({
        url: '/pages/login/index',
      });
    }
  },

  // 登出
  async logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.auth.logout();
          } catch (error) {
            console.error('登出失败:', error);
          }
          
          // 清除本地数据
          apiClient.setToken(null);
          const app = getApp();
          app.globalData.user = null;
          
          // 跳转到登录页
          wx.redirectTo({
            url: '/pages/login/index',
          });
        }
      },
    });
  },
});






