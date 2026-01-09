// pages/scan/index.js - 扫码登录页面
const apiClient = require('../../utils/api');
const { api } = require('../../utils/api');

Page({
  data: {
    scanId: '',
    loading: false,
  },

  onLoad(options) {
    console.log('[扫码页面] onLoad 开始，收到的参数:', options);
    
    // 从扫码获取的参数
    // 兼容 scanId 和 scanID 两种写法
    let scanId = options.scanId || options.scanID;
    console.log('[扫码页面] 直接的 scanId:', scanId);
    
    // 如果没有直接的 scanId，尝试从 scene 中解析
    if (!scanId && options.scene) {
      const scene = decodeURIComponent(options.scene);
      console.log('[扫码页面] Scene 参数:', scene);
      
      // 解析 scene 参数（格式为 sid=xxx）
      const matches = scene.match(/sid=([^&]+)/);
      if (matches && matches[1]) {
        scanId = matches[1];
        console.log('[扫码页面] 从 scene 解析到 scanId:', scanId);
      }
    }
    
    console.log('[扫码页面] 最终 scanId:', scanId);
    
    if (scanId) {
      this.setData({ scanId });
      console.log('[扫码页面] 准备调用 handleScan...');
      this.handleScan(scanId);
    } else {
      console.error('[扫码页面] 没有 scanId，显示错误提示');
      wx.showToast({
        title: '缺少扫码参数',
        icon: 'none',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 处理扫码
  async handleScan(scanId) {
    const { loading } = this.data;

    if (loading) {
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '处理中...' });

    try {
      console.log('[扫码] 开始处理，scanId:', scanId);
      
      // 获取微信登录 code
      console.log('[扫码] 调用 wx.login...');
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => {
            console.log('[扫码] wx.login 成功:', res);
            resolve(res);
          },
          fail: (err) => {
            console.error('[扫码] wx.login 失败:', err);
            reject(err);
          },
        });
      });

      if (!loginRes.code) {
        throw new Error('获取微信登录凭证失败');
      }

      console.log('[扫码] 获取到 code:', loginRes.code);

      // 调用后端扫码接口
      console.log('[扫码] 调用后端接口...');
      const scanResult = await api.auth.scanQrCode(scanId, loginRes.code);
      console.log('[扫码] 后端返回:', scanResult);

      wx.hideLoading();
      
      // 根据后端返回判断：老用户 vs 新用户
      if (scanResult.needBind === false) {
        // 老用户：已有账号绑定，跳转到确认授权页面
        console.log('[扫码] 老用户，跳转到确认授权页面...');
        wx.redirectTo({
          url: `/pages/confirm-login/index?scanId=${scanId}`,
          success: () => {
            console.log('[扫码] 跳转成功');
          },
          fail: (err) => {
            console.error('[扫码] 跳转失败:', err);
          },
        });
      } else {
        // 新用户：需要绑定手机号，跳转到协议页面
        console.log('[扫码] 新用户，跳转到协议页面...');
        wx.redirectTo({
          url: `/pages/agreement/index?scanId=${scanId}`,
          success: () => {
            console.log('[扫码] 跳转成功');
          },
          fail: (err) => {
            console.error('[扫码] 跳转失败:', err);
          },
        });
      }
    } catch (error) {
      console.error('[扫码] 处理失败:', error);
      console.error('[扫码] 错误消息:', error.message);
      console.error('[扫码] 错误类型:', error.constructor.name);
      console.error('[扫码] 错误详情:', JSON.stringify(error, null, 2));
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '扫码失败',
        icon: 'none',
        duration: 3000,
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 3000);
    }
  },
});



