import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { useStore } from '../../App';
import { projectsApi } from '../../api/projects';
import { 
  FileVideo, Trash2, RotateCcw, Clock, RefreshCw
} from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useToast } from '../../hooks/useToast';
import { videosApi } from '../../api/videos';
import { Video } from '../../types';

export const TrashPanel: React.FC = () => {
  const theme = useThemeClasses();
  const toast = useToast();
  const { team: teamContextTeam } = useTeam();
  const { state } = useStore();
  const [deletedVideos, setDeletedVideos] = useState<Video[]>([]);
  const [loadingDeletedVideos, setLoadingDeletedVideos] = useState(false);
  const [restoringVideoId, setRestoringVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // 加载项目列表
  useEffect(() => {
    if (teamContextTeam) {
      projectsApi.findAll(teamContextTeam.id)
        .then(data => setProjects(data))
        .catch(err => console.error('加载项目列表失败:', err));
    }
  }, [teamContextTeam]);

  // 加载回收站视频
  const loadDeletedVideos = useCallback(async () => {
    if (!teamContextTeam) return;
    setLoadingDeletedVideos(true);
    try {
      const videos = await videosApi.getDeletedVideos(teamContextTeam.id);
      setDeletedVideos(videos);
      console.log('回收站视频加载成功，数量:', videos.length);
    } catch (error: any) {
      console.error('加载回收站视频失败:', error);
      toast.error(error?.response?.data?.message || '加载回收站失败');
    } finally {
      setLoadingDeletedVideos(false);
    }
  }, [teamContextTeam, toast]);

  // 当切换到回收站模块或团队变化时，自动加载数据
  useEffect(() => {
    if (state.activeModule === 'trash' && teamContextTeam) {
      loadDeletedVideos();
    }
  }, [state.activeModule, teamContextTeam, loadDeletedVideos]);


  const handleRestoreVideo = async (videoId: string) => {
    setRestoringVideoId(videoId);
    try {
      await videosApi.restoreVideo(videoId);
      toast.success('视频已恢复');
      await loadDeletedVideos();
    } catch (error: any) {
      console.error('恢复视频失败:', error);
      toast.error(error?.response?.data?.message || '恢复视频失败');
    } finally {
      setRestoringVideoId(null);
    }
  };

  const handlePermanentlyDeleteVideo = async (videoId: string) => {
    if (!confirm('确定要彻底删除这个视频吗？此操作不可恢复！')) {
      return;
    }
    setDeletingVideoId(videoId);
    try {
      await videosApi.permanentlyDeleteVideo(videoId);
      toast.success('视频已彻底删除');
      await loadDeletedVideos();
    } catch (error: any) {
      console.error('彻底删除视频失败:', error);
      toast.error(error?.response?.data?.message || '删除视频失败');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const deletedAt = new Date(date);
    const diffMs = now.getTime() - deletedAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} 分钟前`;
      }
      return `${diffHours} 小时前`;
    }
    if (diffDays < 30) {
      return `${diffDays} 天前`;
    }
    return `${Math.floor(diffDays / 30)} 个月前`;
  };

  return (
    <div className={`fixed left-[64px] top-14 bottom-0 right-0 ${theme.bg.primary} ${theme.text.primary} font-sans transition-all duration-300`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.border.primary} ${theme.bg.secondary} flex justify-between items-center`}>
          <div>
            <h2 className={`text-base font-semibold ${theme.text.primary}`}>回收站</h2>
            <p className={`text-xs ${theme.text.muted} mt-0.5`}>
              已删除的视频将在此保留30天，之后自动清理。您可以恢复或彻底删除视频。
            </p>
          </div>
          <button
            onClick={loadDeletedVideos}
            disabled={loadingDeletedVideos}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
              loadingDeletedVideos
                ? 'bg-zinc-700/50 text-zinc-400 cursor-not-allowed'
                : `${theme.bg.hover} ${theme.text.muted} ${theme.text.hover}`
            }`}
            title="刷新回收站"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDeletedVideos ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4 max-w-6xl">

            {loadingDeletedVideos ? (
              <div className={`text-center py-12 ${theme.text.muted}`}>
                <p>加载中...</p>
              </div>
            ) : deletedVideos.length === 0 ? (
              <div className={`text-center py-12 ${theme.text.muted}`}>
                <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>回收站为空</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedVideos.map((video) => {
                  const deletedAt = (video as any).deleted_at || video.uploadTime;
                  const daysSinceDeleted = Math.floor(
                    (new Date().getTime() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const daysRemaining = 30 - daysSinceDeleted;

                  return (
                    <div
                      key={video.id}
                      className={`p-4 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <FileVideo className={`w-5 h-5 ${theme.text.muted} shrink-0`} />
                            <h4 className={`text-sm font-medium ${theme.text.primary} truncate`}>
                              {video.name}
                            </h4>
                          </div>
                          <div className={`text-xs ${theme.text.muted} space-y-1 ml-8`}>
                            <p>项目: {projects.find(p => p.id === video.projectId)?.name || '未知'}</p>
                            <p>删除时间: {formatTimeAgo(deletedAt)}</p>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span className={daysRemaining <= 7 ? 'text-red-400' : ''}>
                                {daysRemaining > 0 
                                  ? `将在 ${daysRemaining} 天后自动清理`
                                  : '即将自动清理'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRestoreVideo(video.id)}
                            disabled={restoringVideoId === video.id}
                            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                              restoringVideoId === video.id
                                ? 'bg-indigo-600/50 text-indigo-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {restoringVideoId === video.id ? '恢复中...' : '恢复'}
                          </button>
                          <button
                            onClick={() => handlePermanentlyDeleteVideo(video.id)}
                            disabled={deletingVideoId === video.id}
                            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                              deletingVideoId === video.id
                                ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingVideoId === video.id ? '删除中...' : '彻底删除'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

