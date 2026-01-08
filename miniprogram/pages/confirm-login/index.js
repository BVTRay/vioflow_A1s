// pages/confirm-login/index.js
const { api } = require('../../utils/api');

Page({
  data: {
    scanId: '',
    loading: false,
  },

  onLoad(options) {
    if (options.scanId) {
      this.setData({
        scanId: options.scanId,
      });
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 确认授权登录
  async confirmLogin() {
    const { scanId, loading } = this.data;

    if (loading) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '授权中...' });

    try {
      console.log('[确认登录] 用户确认授权，scanId:', scanId);

      // 调用后端确认接口（老用户只需要 scanId）
      const result = await api.auth.confirmQrCodeLogin(scanId);
      console.log('[确认登录] 后端返回:', result);

      wx.hideLoading();

      // 显示成功提示
      wx.showToast({
        title: '授权成功',
        icon: 'success',
        duration: 2000,
      });

      // 提示用户回到PC端
      setTimeout(() => {
        wx.showModal({
          title: '授权成功',
          content: '请返回电脑端继续操作',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 用户可以关闭小程序或返回
          },
        });
      }, 2000);
    } catch (error) {
      console.error('[确认登录] 授权失败:', error);
      wx.hideLoading();
      this.setData({ loading: false });
      
      wx.showToast({
        title: error.message || '授权失败',
        icon: 'none',
        duration: 3000,
      });
    }
  },

  // 取消授权
  cancelLogin() {
    console.log('[取消授权] 用户点击取消按钮');
    const { loading } = this.data;

    if (loading) {
      console.log('[取消授权] 正在授权中，忽略取消操作');
      return;
    }

    wx.showModal({
      title: '取消授权',
      content: '确定要取消此次登录吗？',
      confirmText: '确定',
      cancelText: '返回',
      success: (res) => {
        console.log('[取消授权] 对话框结果:', res);
        if (res.confirm) {
          console.log('[取消授权] 用户确认取消');
          wx.showToast({
            title: '已取消',
            icon: 'none',
            duration: 1500,
          });
          // 返回上一页或关闭小程序
          setTimeout(() => {
            console.log('[取消授权] 执行返回操作');
            // 尝试返回上一页
            const pages = getCurrentPages();
            if (pages.length > 1) {
              wx.navigateBack();
            } else {
              // 如果没有上一页，则关闭小程序
              wx.showToast({
                title: '请手动关闭小程序',
                icon: 'none',
              });
            }
          }, 1500);
        } else {
          console.log('[取消授权] 用户选择继续');
        }
      },
      fail: (err) => {
        console.error('[取消授权] 对话框失败:', err);
      },
    });
  },
});

