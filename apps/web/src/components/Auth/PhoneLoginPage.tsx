import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

export const PhoneLoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showWechatLogin, setShowWechatLogin] = useState(false); // 控制是否显示微信登录二维码
  const [qrCode, setQrCode] = useState<string>('');
  const [scanId, setScanId] = useState<string>('');
  const [qrCodeStatus, setQrCodeStatus] = useState<'pending' | 'scanned' | 'confirmed' | 'expired'>('pending');
  const [generatingQrCode, setGeneratingQrCode] = useState(false); // 生成二维码中
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 生成微信登录二维码
  const handleGenerateWechatQrCode = async () => {
    if (generatingQrCode) return;
    
    setGeneratingQrCode(true);
    setShowWechatLogin(true);
    setError('');

    try {
      const result = await authApi.generateWechatQrCode();
      setQrCode(result.qrCode); // 后端返回的是 Base64 Data URL
      setScanId(result.scanId);
      setQrCodeStatus('pending');
      startPolling(result.scanId);
    } catch (err: any) {
      console.error('生成二维码失败:', err);
      setError(err.message || '生成二维码失败，请稍后再试');
      setShowWechatLogin(false);
    } finally {
      setGeneratingQrCode(false);
    }
  };

  // 轮询扫码状态
  const startPolling = (id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await authApi.checkWechatQrCodeStatus(id);
        setQrCodeStatus(status.status);

        const token = status.access_token || (status as any).token;
        if (status.status === 'confirmed' && token) {
          // 登录成功
          apiClient.setToken(token);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          // 使用 React Router 的 navigate 跳转，避免页面刷新
          navigate('/');
        } else if (status.status === 'expired') {
          // 二维码过期
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setQrCodeStatus('expired');
        }
      } catch (err) {
        console.error('检查扫码状态失败:', err);
      }
    }, 3000); // 每3秒轮询一次
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (sending || countdown > 0) return;

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }

    setSending(true);
    setError('');

    try {
      const result = await authApi.sendSms(phone);
      setSending(false);
      
      // 开始倒计时
      let timer = 60;
      setCountdown(timer);
      const countdownInterval = setInterval(() => {
        timer--;
        if (timer <= 0) {
          clearInterval(countdownInterval);
          setCountdown(0);
        } else {
          setCountdown(timer);
        }
      }, 1000);

      // 开发环境显示验证码
      if (result.code) {
        console.log('验证码:', result.code);
        alert(`开发模式：验证码为 ${result.code}`);
      }
    } catch (err: any) {
      setSending(false);
      setError(err.message || '发送验证码失败');
    }
  };

  // 手机号登录
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phone || !code) {
      setError('请填写完整信息');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.phoneLogin(phone, code);
      if (response.accessToken || response.access_token) {
        // 使用 React Router 的 navigate 跳转，避免页面刷新
        navigate('/');
      } else {
        setError('登录失败：未收到认证令牌');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          '登录失败，请检查验证码';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#050505] text-white antialiased selection:bg-cyan-500/30 font-sans overflow-hidden">
      {/* 样式定义 - 复用原有的样式 */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes blob-reverse {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-30px, 50px) scale(1.2); }
          66% { transform: translate(20px, -20px) scale(0.8); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 20s infinite;
        }
        .animate-blob-reverse {
          animation: blob-reverse 25s infinite;
        }
        .animate-blob-slow {
          animation: blob 30s infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .noise-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 20;
          opacity: 0.04;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #171717 inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* SVG 渐变 */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* 左侧：艺术视觉区域 */}
      <div className="hidden lg:flex w-[60%] relative items-center justify-center overflow-hidden bg-[#0a0a0a]">
        <div className="absolute top-8 left-8 z-40 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="19" stroke="white" strokeWidth="0.5" strokeOpacity="0.15"/>
            <path d="M12 14C12 14 14.5 24 20 24C25.5 24 28 14 28 14" stroke="url(#brandGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 20C12 20 16 26 20 26C24 26 28 20 28 20" stroke="url(#brandGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
            <circle cx="20" cy="29" r="2" fill="#06b6d4"/>
          </svg>
          <div className="flex items-center">
            <span className="text-2xl font-light tracking-tight text-white leading-none">纷呈</span>
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/40 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-cyan-500/30 rounded-full blur-[120px] mix-blend-screen animate-blob-reverse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[30%] left-[30%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] mix-blend-screen animate-blob-slow" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="noise-bg"></div>

        <div className="relative z-30 w-[540px] min-h-[360px] p-12 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl animate-fade-in-up flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
          <div className="absolute -top-1 -left-1 w-12 h-12 border-t border-l border-cyan-400/20 rounded-tl-3xl pointer-events-none z-20"></div>
          <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b border-r border-violet-400/20 rounded-br-3xl pointer-events-none z-20"></div>

          <div className="w-full flex flex-col justify-center relative">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl"></div>

            <h2 className="text-5xl font-extrabold leading-tight tracking-tight text-white mb-8 relative z-10">
              Make your<br />
              vision
              <span className="block text-6xl mt-2 bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] font-black italic tracking-wider animate-pulse-slow">
                [VIVID]
              </span>
            </h2>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-[1px] w-16 bg-gradient-to-r from-cyan-400/50 to-transparent"></div>
              <p className="text-sm font-semibold text-white/50 tracking-[0.2em] uppercase">让灵感纷呈涌现</p>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：登录功能区 */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center items-center px-6 sm:px-12 lg:px-0 relative z-10 bg-[#050505]">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="w-full max-w-md lg:max-w-none lg:w-[unset] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-violet-500/10 mb-4 backdrop-blur-sm">
              <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12C10 12 14 26 20 26C26 26 30 12 30 12" stroke="url(#brandGradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="32" r="3" fill="#06b6d4"/>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-light tracking-wide text-white">欢迎回到纷呈</h2>
            </div>
          </div>

          {/* 手机号登录表单 */}
          <form onSubmit={handlePhoneLogin} className="mt-8 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm animate-fade-in-up">
                {error}
              </div>
            )}

            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 ml-1">手机号</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-neutral-500 group-focus-within:text-cyan-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={11}
                  className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 ml-1">验证码</label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-neutral-500 group-focus-within:text-violet-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300"
                    placeholder="请输入验证码"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending || countdown > 0}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-cyan-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {countdown > 0 ? `${countdown}s` : sending ? '发送中...' : '获取验证码'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:from-violet-800 disabled:to-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500/50 animate-fade-in-up group mt-2"
              style={{ animationDelay: '0.5s' }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? '登录中...' : '立即登录'}
                {!loading && (
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                )}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-md"></div>
            </button>
          </form>

          {/* 分隔线 */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#050505] text-neutral-500">或</span>
            </div>
          </div>

          {/* 微信登录按钮 */}
          {!showWechatLogin && (
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <button
                type="button"
                onClick={handleGenerateWechatQrCode}
                disabled={generatingQrCode}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.496-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm6.673 2.118c-2.649 0-4.742 2.146-4.742 4.699 0 2.551 2.093 4.695 4.742 4.695a5.476 5.476 0 0 0 3.304-1.116.495.495 0 0 1 .59-.03l1.657.966a.272.272 0 0 0 .14.045c.135 0 .24-.11.24-.244 0-.06-.02-.12-.04-.17l-.327-1.233a.578.578 0 0 1 .207-.656c1.654-1.18 2.68-2.98 2.68-4.933 0-2.553-2.093-4.699-4.742-4.699zm-2.66 3.847c.45 0 .816.37.816.824a.81.81 0 0 1-.816.822.81.81 0 0 1-.816-.822c0-.455.366-.824.816-.824zm4.077 0c.45 0 .816.37.816.824a.81.81 0 0 1-.816.822.81.81 0 0 1-.816-.822c0-.455.366-.824.816-.824z"/>
                </svg>
                <span>{generatingQrCode ? '生成中...' : '使用微信登录'}</span>
              </button>
            </div>
          )}

          {/* 微信扫码登录二维码 */}
          {showWechatLogin && (
            <div className="animate-fade-in-up mt-4" style={{ animationDelay: '0.6s' }}>
              <div className="text-center">
                <p className="text-sm text-neutral-400 mb-4">使用微信扫码登录</p>
                {generatingQrCode ? (
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <p className="text-neutral-500 text-sm">生成中...</p>
                    </div>
                  </div>
                ) : qrCode ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <img src={qrCode} alt="微信扫码登录" className="w-48 h-48 rounded-lg border border-white/10" />
                      {qrCodeStatus === 'scanned' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <p className="text-white text-sm">已扫码，请在小程序中确认</p>
                        </div>
                      )}
                      {qrCodeStatus === 'expired' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
                          <p className="text-white text-sm mb-2">二维码已过期</p>
                          <button
                            onClick={handleGenerateWechatQrCode}
                            className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                          >
                            点击刷新
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowWechatLogin(false);
                        setQrCode('');
                        setScanId('');
                        setQrCodeStatus('pending');
                        if (pollIntervalRef.current) {
                          clearInterval(pollIntervalRef.current);
                        }
                      }}
                      className="mt-4 text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
                    >
                      返回
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                      <p className="text-neutral-500 text-sm">加载中...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

