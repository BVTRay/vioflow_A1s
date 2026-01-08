import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';
import apiClient from '../../api/client';

interface WechatQrCodeLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type QrCodeStatus = 'pending' | 'scanned' | 'confirmed' | 'expired' | 'error';

export const WechatQrCodeLogin: React.FC<WechatQrCodeLoginProps> = ({ onSuccess, onError }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [scanId, setScanId] = useState<string>('');
  const [status, setStatus] = useState<QrCodeStatus>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // 生成二维码
  const generateQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      setStatus('pending');
      
      const response = await authApi.generateWechatQrCode();
      
      if (mountedRef.current) {
        setQrCode(response.qrCode);
        setScanId(response.scanId);
        setLoading(false);
        
        // 开始轮询状态
        startPolling(response.scanId);
      }
    } catch (err: any) {
      console.error('生成二维码失败:', err);
      const errorMessage = err.response?.data?.message || err.message || '生成二维码失败';
      
      if (mountedRef.current) {
        setError(errorMessage);
        setStatus('error');
        setLoading(false);
        onError?.(errorMessage);
      }
    }
  };

  // 轮询扫码状态
  const startPolling = (id: string) => {
    // 清除之前的轮询
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // 每2秒轮询一次
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await authApi.checkWechatQrCodeStatus(id);
        
        if (!mountedRef.current) {
          stopPolling();
          return;
        }

        setStatus(response.status);

        if (response.status === 'confirmed' && response.access_token) {
          // 登录成功
          stopPolling();
          apiClient.setToken(response.access_token);
          onSuccess?.();
        } else if (response.status === 'expired') {
          // 二维码过期
          stopPolling();
          setError('二维码已过期，请刷新');
        }
      } catch (err: any) {
        console.error('检查扫码状态失败:', err);
        if (mountedRef.current) {
          stopPolling();
          setStatus('error');
          setError('检查状态失败，请刷新二维码');
        }
      }
    }, 2000);
  };

  // 停止轮询
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // 刷新二维码
  const refreshQrCode = () => {
    stopPolling();
    generateQrCode();
  };

  // 组件挂载时生成二维码
  useEffect(() => {
    mountedRef.current = true;
    generateQrCode();

    // 组件卸载时清理
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, []);

  // 状态提示文本
  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return '请使用微信扫描小程序码';
      case 'scanned':
        return '已扫码，请在手机上确认登录';
      case 'confirmed':
        return '登录成功';
      case 'expired':
        return '二维码已过期';
      case 'error':
        return error || '出现错误';
      default:
        return '请使用微信扫描小程序码';
    }
  };

  // 状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'scanned':
        return <Smartphone className="w-6 h-6 text-cyan-400 animate-pulse" />;
      case 'confirmed':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'expired':
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      default:
        return <Smartphone className="w-6 h-6 text-neutral-400" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">微信扫码登录</h3>
          <p className="text-sm text-neutral-400">使用微信扫描下方小程序码</p>
        </div>

        {/* 二维码区域 */}
        <div className="relative">
          <div className="aspect-square w-full max-w-[280px] mx-auto bg-white rounded-xl p-4 relative overflow-hidden">
            {loading ? (
              // 加载状态
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
              </div>
            ) : qrCode ? (
              // 显示二维码
              <>
                <img 
                  src={qrCode} 
                  alt="微信小程序码" 
                  className={`w-full h-full object-contain ${
                    status === 'expired' || status === 'error' ? 'opacity-20 blur-sm' : ''
                  }`}
                />
                
                {/* 遮罩层（过期或错误时显示） */}
                {(status === 'expired' || status === 'error') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <AlertCircle className="w-12 h-12 text-white mb-3" />
                    <button
                      onClick={refreshQrCode}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      刷新二维码
                    </button>
                  </div>
                )}

                {/* 扫码成功遮罩 */}
                {status === 'scanned' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-cyan-600/90 backdrop-blur-sm">
                    <div className="text-center text-white">
                      <Smartphone className="w-16 h-16 mx-auto mb-3 animate-pulse" />
                      <p className="text-lg font-semibold">扫码成功</p>
                      <p className="text-sm mt-1">请在手机上确认登录</p>
                    </div>
                  </div>
                )}

                {/* 登录成功遮罩 */}
                {status === 'confirmed' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-600/90 backdrop-blur-sm">
                    <div className="text-center text-white">
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-3" />
                      <p className="text-lg font-semibold">登录成功</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // 错误状态
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">
                <AlertCircle className="w-12 h-12 mb-3" />
                <p className="text-sm">加载失败</p>
              </div>
            )}
          </div>

          {/* 刷新按钮（在二维码外部） */}
          {!loading && (status === 'pending' || status === 'scanned') && (
            <button
              onClick={refreshQrCode}
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors group"
              title="刷新二维码"
            >
              <RefreshCw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500" />
            </button>
          )}
        </div>

        {/* 状态提示 */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          {getStatusIcon()}
          <span className={`
            ${status === 'confirmed' ? 'text-green-400' : ''}
            ${status === 'scanned' ? 'text-cyan-400' : ''}
            ${status === 'expired' || status === 'error' ? 'text-red-400' : 'text-neutral-300'}
          `}>
            {getStatusText()}
          </span>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="space-y-2 text-xs text-neutral-400">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs">1</span>
              <span>打开微信，扫描上方小程序码</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs">2</span>
              <span>在小程序中勾选用户协议</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs">3</span>
              <span>选择微信手机号快捷登录或手动输入验证码登录</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};







