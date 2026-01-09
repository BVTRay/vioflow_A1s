import React, { useState } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { Shield, ChevronDown, Check } from 'lucide-react';

export const TeamSwitcher: React.FC = () => {
  const { currentTeam, teams, switchTeam, loading } = useTeam();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !currentTeam) {
    return null;
  }

  const handleSwitchTeam = async (teamId: string) => {
    try {
      await switchTeam(teamId);
      setIsOpen(false);
      // 切换团队后刷新页面数据
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch team:', error);
      alert('切换团队失败');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => teams.length > 1 && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm transition-colors ${
          teams.length > 1 
            ? 'cursor-pointer hover:opacity-80' 
            : 'cursor-default'
        }`}
        title={teams.length > 1 ? '点击切换团队' : '当前团队'}
      >
        <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <span className="text-zinc-200 text-xs font-medium">{currentTeam.name}</span>
        {teams.length > 1 && (
          <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && teams.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase mb-1">
                切换团队
              </div>
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSwitchTeam(team.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                    team.id === currentTeam.id
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">{team.code}</div>
                    </div>
                  </div>
                  {team.id === currentTeam.id && (
                    <Check className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

