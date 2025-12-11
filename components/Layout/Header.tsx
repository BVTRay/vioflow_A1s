
import React, { useState, useEffect } from 'react';
import { Bell, ArrowRightLeft, Search, Command, LogOut, User, ChevronDown } from 'lucide-react';
import { AppState } from '../../types';
import { useAuth } from '../../src/hooks/useAuth';
import apiClient from '../../src/api/client';

interface HeaderProps {
  onToggleDrawer: (drawer: AppState['activeDrawer']) => void;
  activeDrawer: AppState['activeDrawer'];
}

export const Header: React.FC<HeaderProps> = ({ onToggleDrawer, activeDrawer }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      apiClient.setToken(null);
      // 使用 window.location 跳转，确保在任何情况下都能正常工作
      window.location.href = '/login';
    } catch (error) {
      // 即使 API 调用失败，也清除本地 token
      apiClient.setToken(null);
      window.location.href = '/login';
    }
    setShowUserMenu(false);
  };

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!user) return '未登录';
    return user.name || user.email || '用户';
  };

  // 获取用户角色显示
  const getUserRole = () => {
    if (!user) return '';
    const roleMap: { [key: string]: string } = {
      'admin': '管理员',
      'user': '成员',
      'editor': '编辑'
    };
    return roleMap[user.role] || user.role;
  };
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800 z-50 flex items-center justify-between px-4 select-none">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 w-64">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <span className="font-bold text-lg tracking-tight text-zinc-100">Vioflow</span>
      </div>

      {/* Center: Global Omni-search (Visual only) */}
      <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 w-[400px] text-sm text-zinc-500 hover:border-zinc-700 transition-colors cursor-text group">
        <Search className="w-4 h-4 mr-2 group-hover:text-zinc-400" />
        <span className="flex-1">跳转至项目、文件或设置...</span>
        <div className="flex items-center gap-1">
          <Command className="w-3 h-3" />
          <span className="text-xs">K</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'transfer' ? 'none' : 'transfer')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'transfer' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-zinc-950"></span>
        </button>
        
        <button 
          onClick={() => onToggleDrawer(activeDrawer === 'messages' ? 'none' : 'messages')}
          className={`p-2 rounded-md transition-colors relative ${activeDrawer === 'messages' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'}`}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
        </button>

        <div className="w-px h-6 bg-zinc-800 mx-2"></div>
        
        {/* 用户菜单 */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-zinc-700 shadow-sm flex items-center justify-center text-white text-xs font-medium">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={getUserDisplayName()} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-medium text-zinc-200">{getUserDisplayName()}</div>
                <div className="text-[10px] text-zinc-500">{getUserRole()}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <div className="text-sm font-medium text-zinc-200">{getUserDisplayName()}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{user.email}</div>
                    <div className="text-[10px] text-indigo-400 mt-1">{getUserRole()}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 border border-zinc-700 shadow-sm cursor-pointer hover:ring-2 ring-indigo-500/50 transition-all"></div>
        )}
      </div>
    </header>
  );
};
