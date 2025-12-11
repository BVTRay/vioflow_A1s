import React, { useState } from 'react';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ username, password });
      if (response.accessToken) {
        // 登录成功，等待一下让 token 保存，然后刷新页面
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '登录失败，请检查账号和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 rounded-lg p-8 shadow-2xl border border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Vioflow MAM</h1>
            <p className="text-zinc-400">视频管理系统</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-2">
                账号
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 text-center mb-3">测试账号：</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>管理员账号:</span>
                <span className="text-zinc-300">admin / admin</span>
              </div>
              <div className="flex justify-between">
                <span>成员账号:</span>
                <span className="text-zinc-300">sarah / admin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

