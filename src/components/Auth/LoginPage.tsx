import React, { useState } from 'react';
import { Terminal } from 'lucide-react';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ username, password });
      // 检查是否有 token（支持 accessToken 或 access_token）
      if (response.accessToken || response.access_token) {
        // 登录成功，等待一下让 token 保存，然后刷新页面
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        setError('登录失败：未收到认证令牌');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          '登录失败，请检查账号和密码';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDevMode = async () => {
    try {
      setLoading(true);
      // 设置开发者模式标记
      localStorage.setItem('dev_mode', 'true');
      
      // 自动使用不恭文化ray账号登录，获取真实token
      // 这样主应用功能页面会使用ray的权限
      try {
        const response = await authApi.login({ username: 'ray@bugong.com', password: 'admin' });
        if (response.accessToken || response.access_token) {
          console.log('🔧 开发者模式：已自动登录 ray@bugong.com 账号');
          // 保存ray的token到localStorage，用于从开发者后台返回时恢复
          const rayToken = response.access_token || response.accessToken;
          localStorage.setItem('ray_user_token', rayToken);
          // token已经通过authApi.login自动保存了
        } else {
          throw new Error('未收到认证令牌');
        }
      } catch (loginError: any) {
        console.error('🔧 开发者模式：自动登录ray账号失败', loginError);
        const errorMsg = loginError?.response?.data?.message || loginError.message || '登录失败';
        setError(`开发者模式启动失败：${errorMsg}\n\n请确认ray@bugong.com账号存在且密码为admin`);
        setLoading(false);
        return;
      }
      
      // 跳转到首页
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error: any) {
      console.error('开发者模式启动失败:', error);
      setError('开发者模式启动失败: ' + (error.message || '未知错误'));
      setLoading(false);
    }
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#050505] text-white antialiased selection:bg-cyan-500/30 font-sans overflow-hidden">
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
        @media (max-width: 1024px) {
          body { overflow-y: auto; }
        }
      `}</style>

      {/* 定义 SVG 渐变 */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
      </svg>

      {/* 左侧：艺术视觉区域 (60%) */}
      <div className="hidden lg:flex w-[60%] relative items-center justify-center overflow-hidden bg-[#0a0a0a]">
        {/* 品牌 Logo */}
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

        {/* 背景流体动画 */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/40 rounded-full blur-[120px] mix-blend-screen animate-blob"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-cyan-500/30 rounded-full blur-[120px] mix-blend-screen animate-blob-reverse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-[30%] left-[30%] w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[100px] mix-blend-screen animate-blob-slow" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="noise-bg"></div>

        {/* 静止展示卡片 */}
        <div className="relative z-30 w-[540px] min-h-[360px] p-12 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl animate-fade-in-up flex items-center justify-center" style={{ animationDelay: '0.5s' }}>
          {/* 装饰边角 */}
          <div className="absolute -top-1 -left-1 w-12 h-12 border-t border-l border-cyan-400/20 rounded-tl-3xl pointer-events-none z-20"></div>
          <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b border-r border-violet-400/20 rounded-br-3xl pointer-events-none z-20"></div>

          {/* 核心内容 */}
          <div className="w-full flex flex-col justify-center relative">
            {/* 背景装饰光效 */}
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
              <h2 className="text-3xl font-bold tracking-tight text-white">欢迎回到 VioFlow</h2>
              <p className="mt-2 text-sm text-neutral-400">登录以访问 <span className="text-neutral-300">纷呈工作区</span></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {error}
              </div>
            )}

            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 ml-1">邮箱或用户名</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-neutral-500 group-focus-within:text-cyan-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300"
                  placeholder="name@vioflow.com"
                />
              </div>
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="text-sm font-medium text-neutral-300">密码</label>
                <a href="#" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">忘记密码?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-neutral-500 group-focus-within:text-violet-400 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  id="passwordInput"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                      <line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:from-violet-800 disabled:to-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500/50 animate-fade-in-up group mt-2"
              style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
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

            {/* 开发者模式字样 - 可点击 */}
            <div className="text-center mt-4 animate-fade-in-up" style={{ animationDelay: '0.55s', animationFillMode: 'forwards' }}>
              <button
                type="button"
                onClick={handleDevMode}
                disabled={loading}
                className="text-xs text-neutral-500 hover:text-yellow-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '启动中...' : '开发者模式'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
            <p className="text-sm text-neutral-500">还没有账号？ <a href="#" className="font-semibold text-white hover:text-cyan-400 transition-colors">免费试用</a></p>
          </div>
          
          <div className="mt-12 pt-6 border-t border-white/5 animate-fade-in-up flex flex-col items-center gap-4" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold font-sans">信赖 VIOFLOW 的团队</p>
            <div className="flex items-center justify-center gap-8 opacity-40">
              <svg className="h-6 w-auto hover:text-white hover:opacity-100 transition-all duration-300 cursor-pointer text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 19H22L12 2ZM12 6L18 17H6L12 6Z" fillRule="evenodd" clipRule="evenodd"/>
              </svg>
              <svg className="h-5 w-auto hover:text-white hover:opacity-100 transition-all duration-300 cursor-pointer text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 12C2 12 5 8 8 8C11 8 11 16 14 16C17 16 22 9 22 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg className="h-6 w-auto hover:text-white hover:opacity-100 transition-all duration-300 cursor-pointer text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <svg className="h-6 w-auto hover:text-white hover:opacity-100 transition-all duration-300 cursor-pointer text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="7.5 4.21 12 12 16.5 4.21"/>
                <polyline points="7.5 19.79 12 12 16.5 19.79"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
