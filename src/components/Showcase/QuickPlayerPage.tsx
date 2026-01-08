import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { showcaseApi } from '../../api/showcase';
import { QuickPlayerTemplate, QuickPlayerVideo } from './QuickPlayerTemplate';

interface QuickPlayerPageData {
  id: string;
  title: string;
  mode: 'quick_player';
  videos: QuickPlayerVideo[];
  hasPassword: boolean;
  expiredAt?: string;
}

export const QuickPlayerPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const [data, setData] = useState<QuickPlayerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  useEffect(() => {
    if (!linkId) {
      setError('无效的链接');
      setLoading(false);
      return;
    }

    loadData();
  }, [linkId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const packageData = await showcaseApi.getByLinkId(linkId!);
      
      // 转换 API 数据为页面数据格式
      const pageData: QuickPlayerPageData = {
        id: packageData.id,
        title: packageData.title || '案例合集',
        mode: 'quick_player',
        videos: packageData.videos?.map((v: any) => ({
          id: v.id,
          name: v.name,
          url: v.storageUrl || v.storage_url || v.url,
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url,
          duration: v.duration
        })) || [],
        hasPassword: packageData.hasPassword || false,
        expiredAt: packageData.expiredAt || packageData.expired_at
      };
      
      setData(pageData);
      
      if (!pageData.hasPassword) {
        setIsPasswordVerified(true);
      }
      
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '加载失败';
      setError(typeof errorMessage === 'string' ? errorMessage : '加载失败');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('请输入密码');
      return;
    }

    try {
      await showcaseApi.verifyPassword(linkId!, password);
      setIsPasswordVerified(true);
      setPasswordError('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '密码错误';
      setPasswordError(typeof errorMessage === 'string' ? errorMessage : '密码错误');
    }
  };

  // 检查链接是否过期
  if (data && data.expiredAt) {
    const expiredDate = new Date(data.expiredAt);
    if (expiredDate < new Date()) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">链接已过期</h2>
            <p className="text-zinc-400">此案例包链接已过期，无法访问</p>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">无法访问</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // 需要密码验证
  if (!isPasswordVerified) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">需要输入密码</h2>
              <p className="text-zinc-500 text-sm">此案例包受密码保护，请输入密码以查看</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="请输入访问密码"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                验证密码
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <QuickPlayerTemplate videos={data.videos} />
    </div>
  );
};
