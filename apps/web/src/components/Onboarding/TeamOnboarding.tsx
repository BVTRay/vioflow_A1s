import React, { useState } from 'react';
import { Shield, UserPlus, ArrowRight, Loader2, Check } from 'lucide-react';
import { teamsApi } from '../../api/teams';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const TeamOnboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 创建团队表单
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  // 加入团队表单
  const [teamCode, setTeamCode] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!teamName.trim()) {
      setError('请输入团队名称');
      setLoading(false);
      return;
    }

    try {
      const newTeam = await teamsApi.create({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
      });
      
      setSuccess(true);
      setTimeout(() => {
        // 导航到主应用（会自动加载团队数据）
        navigate('/', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create team:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          '创建团队失败，请重试';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!teamCode.trim()) {
      setError('请输入团队编码');
      setLoading(false);
      return;
    }

    // 验证编码长度
    const code = teamCode.trim().toUpperCase();
    if (code.length < 8 || code.length > 12) {
      setError('团队编码应为 8-12 位字母或数字');
      setLoading(false);
      return;
    }

    try {
      await teamsApi.joinByCode({ code });
      
      setSuccess(true);
      setTimeout(() => {
        // 导航到主应用（会自动加载团队数据）
        navigate('/', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error('Failed to join team:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          '加入团队失败，请检查团队编码是否正确';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              {activeTab === 'create' ? '团队创建成功！' : '成功加入团队！'}
            </h2>
            <p className="text-zinc-400">正在跳转到主页面...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 欢迎标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">
            欢迎，{user?.name || '新用户'}！
          </h1>
          <p className="text-zinc-400">
            请先创建或加入一个团队以开始使用
          </p>
        </div>

        {/* 两个大卡片 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 创建团队卡片 */}
          <div
            className={`relative p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 rounded-xl cursor-pointer transition-all ${
              activeTab === 'create'
                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            onClick={() => {
              setActiveTab('create');
              setError('');
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
              {activeTab === 'create' && (
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">创建新团队</h3>
            <p className="text-sm text-zinc-400 mb-6">
              创建一个全新的团队，您将自动成为超级管理员
            </p>
            {activeTab === 'create' && (
              <form onSubmit={handleCreateTeam} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    团队名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="例如：我的团队"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    团队描述（可选）
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="描述一下您的团队..."
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    disabled={loading}
                  />
                </div>
                {error && activeTab === 'create' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      创建团队
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* 加入团队卡片 */}
          <div
            className={`relative p-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 rounded-xl cursor-pointer transition-all ${
              activeTab === 'join'
                ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
            onClick={() => {
              setActiveTab('join');
              setError('');
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-emerald-400" />
              </div>
              {activeTab === 'join' && (
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">加入已有团队</h3>
            <p className="text-sm text-zinc-400 mb-6">
              使用团队编码加入已存在的团队
            </p>
            {activeTab === 'join' && (
              <form onSubmit={handleJoinTeam} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    团队编码 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => {
                      // 只允许字母和数字，自动转大写
                      const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                      setTeamCode(value);
                    }}
                    placeholder="输入 8-12 位团队编码"
                    maxLength={12}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-lg tracking-wider"
                    autoFocus
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    编码应为 8-12 位字母或数字组合
                  </p>
                </div>
                {error && activeTab === 'join' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !teamCode.trim() || teamCode.length < 8}
                  className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加入中...
                    </>
                  ) : (
                    <>
                      加入团队
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            如果您有团队编码，请联系团队管理员获取
          </p>
        </div>
      </div>
    </div>
  );
};

