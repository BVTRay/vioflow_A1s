import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { useStore } from '../../App';
import { projectsApi } from '../../api/projects';
import { 
  FileVideo, Trash2, RotateCcw, Clock, RefreshCw, ChevronDown, ChevronRight
} from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useToast } from '../../hooks/useToast';
import { videosApi } from '../../api/videos';
import { Video } from '../../types';

export const TrashPanel: React.FC = () => {
  const theme = useThemeClasses();
  const toast = useToast();
  const { currentTeam } = useTeam(); // 修复: 使用currentTeam而不是team
  const { state } = useStore();
  const [deletedVideos, setDeletedVideos] = useState<Video[]>([]);
  const [loadingDeletedVideos, setLoadingDeletedVideos] = useState(false);
  const [restoringVideoId, setRestoringVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // 展开的视频组

  // 加载项目列表
  useEffect(() => {
    if (currentTeam) {
      projectsApi.getAll({ teamId: currentTeam.id })
        .then(result => {
          // 处理分页格式
          const data = Array.isArray(result) ? result : result.data;
          setProjects(data);
        })
        .catch(err => console.error('加载项目列表失败:', err));
    }
  }, [currentTeam]);

  // 加载回收站视频
  const loadDeletedVideos = useCallback(async () => {
    if (!currentTeam) {
      console.warn('⚠️ TrashPanel: 没有团队信息,无法加载回收站');
      return;
    }
    console.log('🗑️ TrashPanel: 开始加载回收站视频, teamId:', currentTeam.id);
    setLoadingDeletedVideos(true);
    try {
      const videos = await videosApi.getDeletedVideos(currentTeam.id);
      setDeletedVideos(videos);
      console.log('✅ TrashPanel: 回收站视频加载成功，数量:', videos.length);
      if (videos.length > 0) {
        console.log('📊 TrashPanel: 第一个视频数据:', videos[0]);
      }
    } catch (error: any) {
      console.error('❌ TrashPanel: 加载回收站视频失败:', error);
      console.error('❌ TrashPanel: 错误详情:', error?.response?.data || error.message);
      toast.error(error?.response?.data?.message || '加载回收站失败');
    } finally {
      setLoadingDeletedVideos(false);
    }
  }, [currentTeam, toast]);

  // 当切换到回收站模块或团队变化时，自动加载数据
  useEffect(() => {
    console.log('🔄 TrashPanel useEffect触发:', {
      activeModule: state.activeModule,
      hasTeam: !!currentTeam,
      teamId: currentTeam?.id
    });
    if (state.activeModule === 'trash' && currentTeam) {
      console.log('✅ TrashPanel: 条件满足,开始加载回收站');
      // 直接调用内联函数，避免 loadDeletedVideos 作为依赖导致的重复触发
      const loadVideos = async () => {
        console.log('🗑️ TrashPanel: 开始加载回收站视频, teamId:', currentTeam.id);
        setLoadingDeletedVideos(true);
        try {
          const videos = await videosApi.getDeletedVideos(currentTeam.id);
          setDeletedVideos(videos);
          console.log('✅ TrashPanel: 回收站视频加载成功，数量:', videos.length);
          if (videos.length > 0) {
            console.log('📊 TrashPanel: 第一个视频数据:', videos[0]);
          }
        } catch (error: any) {
          console.error('❌ TrashPanel: 加载回收站视频失败:', error);
          console.error('❌ TrashPanel: 错误详情:', error?.response?.data || error.message);
          toast.error(error?.response?.data?.message || '加载回收站失败');
        } finally {
          setLoadingDeletedVideos(false);
        }
      };
      loadVideos();
    } else {
      console.log('⚠️ TrashPanel: 条件不满足,不加载回收站');
    }
  }, [state.activeModule, currentTeam?.id]); // 只依赖 activeModule 和 currentTeam.id


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

  // 按 projectId 和 baseName 分组视频
  const groupedVideos = useMemo(() => {
    const groups = new Map<string, Video[]>();
    
    deletedVideos.forEach(video => {
      const projectId = (video as any).project_id || video.projectId;
      const baseName = video.baseName || video.name;
      const key = `${projectId}_${baseName}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(video);
    });
    
    // 对每个组内的视频按版本号排序（降序）
    groups.forEach(videos => {
      videos.sort((a, b) => (b.version || 0) - (a.version || 0));
    });
    
    return Array.from(groups.entries()).map(([key, videos]) => ({
      key,
      projectId: (videos[0] as any).project_id || videos[0].projectId,
      baseName: videos[0].baseName || videos[0].name,
      videos,
      latestVideo: videos[0], // 最新版本
      versionCount: videos.length
    }));
  }, [deletedVideos]);

  // 切换组的展开/折叠状态
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // 恢复一个组的所有版本
  const handleRestoreGroup = async (groupKey: string, videos: Video[]) => {
    setRestoringVideoId(groupKey);
    try {
      // 恢复所有版本
      await Promise.all(videos.map(video => videosApi.restoreVideo(video.id)));
      toast.success(`已恢复 ${videos.length} 个版本`);
      await loadDeletedVideos();
    } catch (error: any) {
      console.error('恢复视频失败:', error);
      toast.error(error?.response?.data?.message || '恢复视频失败');
    } finally {
      setRestoringVideoId(null);
    }
  };

  // 彻底删除一个组的所有版本
  const handlePermanentlyDeleteGroup = async (groupKey: string, videos: Video[]) => {
    if (!confirm(`确定要彻底删除这个视频的所有 ${videos.length} 个版本吗？此操作不可恢复！`)) {
      return;
    }
    setDeletingVideoId(groupKey);
    try {
      // 彻底删除所有版本
      await Promise.all(videos.map(video => videosApi.permanentlyDeleteVideo(video.id)));
      toast.success(`已彻底删除 ${videos.length} 个版本`);
      await loadDeletedVideos();
    } catch (error: any) {
      console.error('彻底删除视频失败:', error);
      toast.error(error?.response?.data?.message || '删除视频失败');
    } finally {
      setDeletingVideoId(null);
    }
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
                {groupedVideos.map((group) => {
                  const isExpanded = expandedGroups.has(group.key);
                  const latestVideo = group.latestVideo;
                  const deletedAt = (latestVideo as any).deleted_at || latestVideo.uploadTime;
                  const daysSinceDeleted = Math.floor(
                    (new Date().getTime() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const daysRemaining = 30 - daysSinceDeleted;
                  const projectName = projects.find(p => p.id === group.projectId)?.name || '未知';

                  return (
                    <div key={group.key}>
                      {/* 主卡片 - 显示最新版本 */}
                      <div
                        className={`p-4 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {/* 展开/折叠按钮（仅多版本时显示） */}
                              {group.versionCount > 1 && (
                                <button
                                  onClick={() => toggleGroup(group.key)}
                                  className={`p-1 rounded hover:bg-zinc-700/50 transition-colors ${theme.text.muted}`}
                                  title={isExpanded ? '折叠版本' : '展开版本'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <FileVideo className={`w-5 h-5 ${theme.text.muted} shrink-0`} />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <h4 className={`text-sm font-medium ${theme.text.primary} truncate`}>
                                  {group.baseName}
                                </h4>
                                {group.versionCount > 1 && (
                                  <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full shrink-0">
                                    {group.versionCount} 个版本
                                  </span>
                                )}
                                {group.versionCount === 1 && latestVideo.version && (
                                  <span className="px-2 py-0.5 text-xs bg-zinc-700/50 text-zinc-400 rounded-full shrink-0">
                                    v{latestVideo.version}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`text-xs ${theme.text.muted} space-y-1 ${group.versionCount > 1 ? 'ml-12' : 'ml-8'}`}>
                              <p>项目: {projectName}</p>
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
                              onClick={() => group.versionCount > 1 
                                ? handleRestoreGroup(group.key, group.videos)
                                : handleRestoreVideo(latestVideo.id)}
                              disabled={restoringVideoId === group.key || restoringVideoId === latestVideo.id}
                              className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                restoringVideoId === group.key || restoringVideoId === latestVideo.id
                                  ? 'bg-indigo-600/50 text-indigo-300 cursor-not-allowed'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                              title={group.versionCount > 1 ? `恢复所有 ${group.versionCount} 个版本` : '恢复'}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {restoringVideoId === group.key || restoringVideoId === latestVideo.id 
                                ? '恢复中...' 
                                : group.versionCount > 1 ? '恢复全部' : '恢复'}
                            </button>
                            <button
                              onClick={() => group.versionCount > 1
                                ? handlePermanentlyDeleteGroup(group.key, group.videos)
                                : handlePermanentlyDeleteVideo(latestVideo.id)}
                              disabled={deletingVideoId === group.key || deletingVideoId === latestVideo.id}
                              className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
                                deletingVideoId === group.key || deletingVideoId === latestVideo.id
                                  ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-500 text-white'
                              }`}
                              title={group.versionCount > 1 ? `彻底删除所有 ${group.versionCount} 个版本` : '彻底删除'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deletingVideoId === group.key || deletingVideoId === latestVideo.id 
                                ? '删除中...' 
                                : group.versionCount > 1 ? '删除全部' : '彻底删除'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 展开的版本列表 */}
                      {isExpanded && group.versionCount > 1 && (
                        <div className="ml-12 mt-2 space-y-2">
                          {group.videos.map((video, index) => {
                            const versionDeletedAt = (video as any).deleted_at || video.uploadTime;
                            const versionDaysSinceDeleted = Math.floor(
                              (new Date().getTime() - new Date(versionDeletedAt).getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const versionDaysRemaining = 30 - versionDaysSinceDeleted;

                            return (
                              <div
                                key={video.id}
                                className={`p-3 ${theme.bg.tertiary} border ${theme.border.secondary} rounded-lg`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                      <span className="px-2 py-0.5 text-xs bg-zinc-700/50 text-zinc-400 rounded shrink-0">
                                        v{video.version}
                                      </span>
                                      <span className={`text-xs ${theme.text.muted}`}>
                                        {video.name}
                                      </span>
                                      {index === 0 && (
                                        <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-400 rounded shrink-0">
                                          最新
                                        </span>
                                      )}
                                    </div>
                                    <div className={`text-xs ${theme.text.muted} ml-0 space-y-0.5`}>
                                      <p>删除时间: {formatTimeAgo(versionDeletedAt)}</p>
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        <span className={versionDaysRemaining <= 7 ? 'text-red-400' : ''}>
                                          {versionDaysRemaining > 0 
                                            ? `将在 ${versionDaysRemaining} 天后自动清理`
                                            : '即将自动清理'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleRestoreVideo(video.id)}
                                      disabled={restoringVideoId === video.id}
                                      className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                        restoringVideoId === video.id
                                          ? 'bg-indigo-600/50 text-indigo-300 cursor-not-allowed'
                                          : 'bg-indigo-600/80 hover:bg-indigo-500 text-white'
                                      }`}
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      {restoringVideoId === video.id ? '恢复中...' : '恢复'}
                                    </button>
                                    <button
                                      onClick={() => handlePermanentlyDeleteVideo(video.id)}
                                      disabled={deletingVideoId === video.id}
                                      className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                                        deletingVideoId === video.id
                                          ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                                          : 'bg-red-600/80 hover:bg-red-500 text-white'
                                      }`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      {deletingVideoId === video.id ? '删除中...' : '删除'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

