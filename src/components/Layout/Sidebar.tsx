
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Settings, HardDrive, Clapperboard, LayoutDashboard, Terminal, Share2 } from 'lucide-react';
import { ModuleType } from '../../types';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { isDevMode } from '../../utils/devMode';

interface SidebarProps {
  activeModule: ModuleType;
  onChangeModule: (m: ModuleType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onChangeModule }) => {
  const theme = useThemeClasses();
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '工作台', type: 'dashboard' as ModuleType },
    { id: 'review', icon: PlayCircle, label: '审阅', type: 'review' as ModuleType },
    { id: 'delivery', icon: HardDrive, label: '交付', type: 'delivery' as ModuleType },
    { id: 'showcase', icon: Clapperboard, label: '案例', type: 'showcase' as ModuleType },
    { id: 'share', icon: Share2, label: '分享', type: 'share' as ModuleType },
  ];

  return (
    <nav className={`fixed left-0 top-14 bottom-0 w-[64px] ${theme.bg.primary} border-r ${theme.border.primary} z-40 flex flex-col items-center py-4 gap-6`}>
      
      {/* Main Modules */}
      <div className="flex flex-col gap-2 w-full px-2 pt-2">
        {navItems.map((item) => (
          <SidebarItem 
            key={item.id}
            active={activeModule === item.type}
            icon={item.icon}
            label={item.label}
            onClick={() => onChangeModule(item.type)}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-4 w-full px-2 pb-4">
        <SidebarItem 
          active={activeModule === 'settings'} 
          icon={Settings} 
          label="" 
          onClick={() => onChangeModule('settings')} 
        />
        {/* 开发者后台入口 - 仅在开发者模式下显示 */}
        {isDevMode() && (
          <SidebarItem 
            active={false} 
            icon={Terminal} 
            label="" 
            onClick={async () => {
              // 保存当前ray的token，用于从开发者后台返回时恢复
              const apiClient = (await import('../../api/client')).default;
              const currentToken = apiClient.getToken();
              if (currentToken) {
                localStorage.setItem('ray_user_token', currentToken);
              }
              // 使用开发者账号（admin@vioflow.com）登录获取token
              try {
                const { authApi } = await import('../../api/auth');
                const response = await authApi.login({ username: 'admin@vioflow.com', password: 'admin' });
                if (response.accessToken || response.access_token) {
                  // 保存admin的token
                  apiClient.setToken(response.access_token || response.accessToken);
                  // 跳转到开发者后台
                  navigate('/admin/users');
                }
              } catch (error: any) {
                console.error('开发者后台登录失败:', error);
                alert('开发者后台登录失败: ' + (error?.response?.data?.message || error.message));
              }
            }}
            title="开发者后台（使用开发者账号）"
          />
        )}
      </div>
    </nav>
  );
};

const SidebarItem: React.FC<{ 
  active: boolean; 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  title?: string;
}> = ({ active, icon: Icon, label, onClick, title }) => {
  const theme = useThemeClasses();

  return (
    <button 
      onClick={onClick}
      title={title}
      className={`
        flex flex-col items-center justify-center w-full py-2.5 transition-all duration-200 group relative
        ${active 
          ? `${theme.text.indigo}` 
          : `${theme.text.disabled} ${theme.text.hover}`
        }
      `}
    >
      <Icon className={`w-5 h-5 ${label ? 'mb-1' : ''} ${active ? 'stroke-[1.5px] drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'stroke-[1.5px]'}`} />
      {label && <span className={`text-[10px] font-medium leading-none tracking-wide opacity-80 scale-90 ${active ? '' : theme.text.muted}`}>{label}</span>}
    </button>
  );
};
