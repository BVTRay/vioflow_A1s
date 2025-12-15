
import React, { useState } from 'react';
import { Play, MoreVertical, Plus, Check, Clock, LayoutGrid, List, SlidersHorizontal, FileVideo, Film, CheckCircle2, Share2, AlertTriangle, Lock, Download, Copy, X, ArrowRight, Package, Power, Eye, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { useStore } from '../../App';
import { Video, DeliveryPackage } from '../../types';
import { PreviewPlayer } from './PreviewPlayer';
import { sharesApi } from '../../api/shares';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useTeam } from '../../contexts/TeamContext';

export const MainBrowser: React.FC = () => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { currentTeam } = useTeam();
  const { activeModule, showWorkbench, projects, selectedProjectId, selectedVideoId, videos, cart, searchTerm, browserViewMode, browserCardSize, reviewViewMode, deliveryViewMode, deliveries, selectedDeliveryFiles, isRetrievalPanelVisible, selectedGroupTag, selectedGroupTags, isTagMultiSelectMode, tags } = state;
  const project = projects.find(p => p.id === selectedProjectId);
  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const delivery = deliveries.find(d => d.projectId === selectedProjectId);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set()); // 选中的文件/项目ID
  const [lastClickTime, setLastClickTime] = React.useState<{id: string, time: number} | null>(null); // 用于双击检测
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set()); // 展开的组/项目ID（列表模式）
  
  // 响应式：检测窗口宽度，决定是否显示按钮文字
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const showButtonText = windowWidth > 1200; // 宽度大于1200px时显示文字
  
  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 已交付项目点击时隐藏操作台
  React.useEffect(() => {
    if (activeModule === 'delivery' && project && project.status === 'delivered') {
      dispatch({ type: 'TOGGLE_WORKBENCH', payload: false });
    }
  }, [activeModule, project, dispatch]);

  // 切换项目、模块或视图时自动关闭播放器
  React.useEffect(() => {
    if (activeModule === 'delivery' || activeModule === 'showcase') {
      setPreviewVideoId(null);
    }
  }, [activeModule, selectedProjectId, selectedVideoId, reviewViewMode, deliveryViewMode, state.showcaseViewMode, state.activeTag, state.searchTerm]);

  // Share Modal State
  const [shareState, setShareState] = useState<{
      isOpen: boolean;
      video: Video | null;
      step: 'warning' | 'config' | 'success';
      isHistorical: boolean;
      justification: string;
      allowDownload: boolean;
      hasPassword: boolean;
      password: string;
      generatedLink: string;
      isLoading: boolean;
      error: string;
  }>({
      isOpen: false,
      video: null,
      step: 'config',
      isHistorical: false,
      justification: '',
      allowDownload: false,
      hasPassword: false,
      password: '',
      generatedLink: '',
      isLoading: false,
      error: ''
  });

  // Review Share Links State
  const [reviewShareLinks, setReviewShareLinks] = React.useState<any[]>([]);
  const [reviewShareLinksLoading, setReviewShareLinksLoading] = React.useState(true);

  // Delivery Share Links State
  const [deliveryShareLinks, setDeliveryShareLinks] = React.useState<any[]>([]);
  const [deliveryShareLinksLoading, setDeliveryShareLinksLoading] = React.useState(true);

  // Load review share links
  React.useEffect(() => {
    if (activeModule === 'review' && reviewViewMode === 'packages') {
      setReviewShareLinksLoading(true);
      const teamId = currentTeam?.id;
      sharesApi.getAll(teamId)
        .then((links) => {
          const reviewLinks = links.filter((link: any) => 
            link.type === 'video_review' || link.type === 'video_share'
          );
          setReviewShareLinks(reviewLinks);
        })
        .catch((error) => {
          console.error('Failed to load review share links:', error);
        })
        .finally(() => {
          setReviewShareLinksLoading(false);
        });
    }
  }, [activeModule, reviewViewMode, currentTeam?.id]);

  // Load delivery share links
  React.useEffect(() => {
    if (activeModule === 'delivery' && deliveryViewMode === 'packages') {
      setDeliveryShareLinksLoading(true);
      const teamId = currentTeam?.id;
      sharesApi.getAll(teamId)
        .then((links) => {
          const deliveryLinks = links.filter((link: any) => 
            link.type === 'delivery_package'
          );
          setDeliveryShareLinks(deliveryLinks);
        })
        .catch((error) => {
          console.error('Failed to load delivery share links:', error);
        })
        .finally(() => {
          setDeliveryShareLinksLoading(false);
        });
    }
  }, [activeModule, deliveryViewMode, currentTeam?.id]);
  
  // Helper function to get matched tags for a video
  const getMatchedTagsForVideo = (video: Video): string[] => {
    const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
      ? selectedGroupTags 
      : selectedGroupTag 
        ? [selectedGroupTag] 
        : [];
    
    if (tagsToFilter.length === 0) return [];
    
    const matchedTags: string[] = [];
    
    tagsToFilter.forEach(tagName => {
      const tag = tags.find(t => t.name === tagName);
      const hasTag = video.tags?.includes(tagName) || (tag && video.tagIds?.includes(tag.id));
      if (hasTag) {
        matchedTags.push(tagName);
      }
    });
    
    return matchedTags;
  };
  
  // Content Logic
  let displayVideos: Video[] = [];
  
  if (activeModule === 'showcase') {
      // Showcase: 临时浏览区优先 filteredShowcaseVideos，否则全部案例文件
      const caseFiles = videos.filter(v => v.isCaseFile);
      if (state.filteredShowcaseVideos.length > 0) {
          displayVideos = caseFiles.filter(v => state.filteredShowcaseVideos.includes(v.id));
      } else {
          displayVideos = caseFiles;
      }
      if (searchTerm) {
          displayVideos = displayVideos.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
  } else if (selectedProjectId) {
      // Review/Delivery: Show videos for specific project
      displayVideos = videos.filter(v => v.projectId === selectedProjectId);
  }

  // Margin Calculation
  const leftMargin = isRetrievalPanelVisible ? 'ml-[384px]' : 'ml-[64px]';
  const marginClass = `${leftMargin} pt-14 pb-10 transition-all duration-300 ease-in-out ${showWorkbench ? 'mr-[390px]' : 'mr-4'}`;
  
  // 资源管理器视图导航状态
  const [explorerView, setExplorerView] = React.useState<'groups' | 'projects' | 'videos'>(() => {
    // 如果已选中项目，初始状态为 videos
    return selectedProjectId ? 'videos' : 'groups';
  });
  const [selectedGroupName, setSelectedGroupName] = React.useState<string | null>(null);
  
  // 当 selectedProjectId 变化时，更新导航状态
  React.useEffect(() => {
    if (selectedProjectId) {
      setExplorerView('videos');
    } else if (selectedGroupName) {
      setExplorerView('projects');
    } else {
      setExplorerView('groups');
    }
  }, [selectedProjectId, selectedGroupName]);
  
  // 当模块切换时，重置导航状态
  React.useEffect(() => {
    if (!isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase')) {
      setSelectedGroupName(null);
      setExplorerView('groups');
      if (selectedProjectId) {
        dispatch({ type: 'SELECT_PROJECT', payload: null });
      }
    }
  }, [activeModule]);
  
  // 获取当前模块的项目列表
  const getModuleProjects = () => {
    if (activeModule === 'review') {
      return projects.filter(p => p.status === 'active' || p.status === 'finalized');
    } else if (activeModule === 'delivery') {
      return projects.filter(p => p.status === 'finalized' || p.status === 'delivered');
    } else if (activeModule === 'showcase') {
      return projects; // 案例模块显示所有项目
    }
    return [];
  };
  
  // 按组分组项目
  const groupProjectsByGroup = (projectList: typeof projects) => {
    const groups: Record<string, typeof projects> = {};
    projectList.forEach(p => {
      const groupName = p.group || '未分类';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(p);
    });
    return groups;
  };
  
  // 导航函数
  const navigateToGroup = (groupName: string) => {
    setSelectedGroupName(groupName);
    setExplorerView('projects');
    dispatch({ type: 'SELECT_PROJECT', payload: null });
  };
  
  const navigateToProject = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    setExplorerView('videos');
  };
  
  const navigateBack = () => {
    if (explorerView === 'videos') {
      // 从视频返回到项目列表（保持在同一组内）
      dispatch({ type: 'SELECT_PROJECT', payload: null });
      if (selectedGroupName) {
        setExplorerView('projects');
      } else {
        // 如果没有选中的组，返回到组列表
        setExplorerView('groups');
      }
    } else if (explorerView === 'projects') {
      // 从项目列表返回到组列表
      setSelectedGroupName(null);
      setExplorerView('groups');
    }
  };

  const renderHeader = () => {
    // 资源管理器视图的 header
    if (!isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase')) {
      if (explorerView === 'videos' && selectedProjectId) {
        const selectedProject = projects.find(p => p.id === selectedProjectId);
        if (selectedProject) {
          const statusMap = {
            'active': '进行中',
            'finalized': '已定版',
            'delivered': '已交付',
            'archived': '已归档'
          };
          return (
            <div className="min-w-0 flex-shrink">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 whitespace-nowrap">
                <button onClick={navigateBack} className="hover:text-zinc-300 transition-colors">
                  {selectedGroupName || '项目列表'}
                </button>
                <span className="flex-shrink-0">/</span>
                <span className="truncate">{selectedProject.name}</span>
                <span className="flex-shrink-0">/</span>
                <span className={`uppercase px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider flex-shrink-0
                  ${selectedProject.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                  ${selectedProject.status === 'finalized' ? 'bg-orange-500/10 text-orange-400' : ''}
                  ${selectedProject.status === 'delivered' ? 'bg-indigo-500/10 text-indigo-400' : ''}
                `}>
                  {statusMap[selectedProject.status]}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-zinc-100 tracking-tight whitespace-nowrap truncate">{selectedProject.name}</h1>
            </div>
          );
        }
      } else if (explorerView === 'projects' && selectedGroupName) {
        return (
          <div className="min-w-0 flex-shrink">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 whitespace-nowrap">
              <button onClick={navigateBack} className="hover:text-zinc-300 transition-colors">
                {activeModule === 'review' && '审阅'}
                {activeModule === 'delivery' && '交付'}
                {activeModule === 'showcase' && '案例'}
              </button>
              <span className="flex-shrink-0">/</span>
              <span className="truncate">{selectedGroupName}</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight whitespace-nowrap truncate">{selectedGroupName}</h1>
          </div>
        );
      }
      return (
        <div className="min-w-0 flex-shrink">
          <div className="text-xs text-zinc-500 mb-1 whitespace-nowrap">
            {activeModule === 'review' && '审阅'}
            {activeModule === 'delivery' && '交付'}
            {activeModule === 'showcase' && '案例'}
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight whitespace-nowrap truncate">项目列表</h1>
        </div>
      );
    }
    
    if (activeModule === 'showcase') {
        return (
            <div className="min-w-0 flex-shrink">
                <div className="text-xs text-zinc-500 mb-1 whitespace-nowrap">案例库</div>
                <h1 className="text-xl font-semibold text-zinc-100 tracking-tight whitespace-nowrap truncate">可用案例视频</h1>
            </div>
        );
    }
    if (!project) return <h1 className="text-xl font-semibold text-zinc-500 whitespace-nowrap truncate">请选择一个项目以查看内容...</h1>;
    
    // Status Mapping
    const statusMap = {
        'active': '进行中',
        'finalized': '已定版',
        'delivered': '已交付',
        'archived': '已归档'
    };

    return (
        <div className="min-w-0 flex-shrink">
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1 whitespace-nowrap">
                <span className="truncate">{project.client}</span>
                <span className="flex-shrink-0">/</span>
                <span className={`uppercase px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider flex-shrink-0
                    ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                    ${project.status === 'finalized' ? 'bg-orange-500/10 text-orange-400' : ''}
                    ${project.status === 'delivered' ? 'bg-indigo-500/10 text-indigo-400' : ''}
                `}>
                    {statusMap[project.status]}
                </span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight whitespace-nowrap truncate">{project.name}</h1>
        </div>
    );
  };

  // Group videos by "Series" (base filename without vX_ prefix)
  const groupVideosBySeries = (videos: Video[]) => {
      const groups: Record<string, Video[]> = {};
      videos.forEach(video => {
          // Regex to strip v1_ v12_ etc from start
          const baseName = video.name.replace(/^v\d+_/, '');
          if (!groups[baseName]) {
              groups[baseName] = [];
          }
          groups[baseName].push(video);
      });
      
      // Sort versions within groups (Descending: v2 -> v1)
      // This ensures the LATEST version is at index 0 (Leftmost in Grid)
      Object.keys(groups).forEach(key => {
          groups[key].sort((a, b) => b.version - a.version);
      });
      
      return groups;
  };

  const handleShareClick = (video: Video, isLatest: boolean) => {
      setShareState({
          isOpen: true,
          video: video,
          step: isLatest ? 'config' : 'warning',
          isHistorical: !isLatest,
          justification: '',
          allowDownload: false,
          hasPassword: false,
          generatedLink: ''
      });
  };

  const handleGenerateLink = async () => {
      if (!shareState.video || !project) return;

      setShareState(prev => ({ ...prev, isLoading: true, error: '' }));

      try {
          // 计算7天后的过期时间
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          const shareLink = await sharesApi.create({
              type: 'video_review',
              videoId: shareState.video.id,
              projectId: project.id,
              allowDownload: shareState.allowDownload,
              hasPassword: shareState.hasPassword,
              password: shareState.hasPassword ? shareState.password : undefined,
              expiresAt: expiresAt.toISOString(),
              justification: shareState.isHistorical ? shareState.justification : undefined,
          });

          // 生成分享链接 - 使用环境变量或默认域名
          const shareDomain = import.meta.env.VITE_SHARE_DOMAIN || window.location.origin;
          const link = `${shareDomain}/share/${shareLink.token}`;
          
          setShareState(prev => ({ 
              ...prev, 
              step: 'success', 
              generatedLink: link,
              isLoading: false 
          }));
      } catch (error: any) {
          console.error('Create share link error:', error);
          let errorMessage = '创建分享链接失败，请重试';
          
          if (error.response?.status === 401) {
              errorMessage = '未登录或登录已过期，请重新登录';
          } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
          } else if (error.message) {
              errorMessage = error.message;
          }
          
          setShareState(prev => ({ 
              ...prev, 
              isLoading: false,
              error: errorMessage
          }));
      }
  };

  const renderShareModal = () => {
      if (!shareState.isOpen || !shareState.video) return null;

      return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className={`${theme.bg.modal} ${theme.text.primary} border ${theme.border.secondary} w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden`}>
                  {/* Header */}
                  <div className={`px-5 py-4 border-b ${theme.border.primary} flex items-center justify-between ${theme.bg.primary}`}>
                      <h3 className={`font-semibold ${theme.text.primary} flex items-center gap-2`}>
                          <Share2 className="w-4 h-4 text-indigo-500" />
                          创建对外分享
                      </h3>
                      <button onClick={() => setShareState(prev => ({ ...prev, isOpen: false }))}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
                  </div>

                  {/* Body Content based on Step */}
                  <div className={`p-6 ${theme.bg.modal} ${theme.text.primary}`}>
                      
                      {/* STEP 1: WARNING (Historical) */}
                      {shareState.step === 'warning' && (
                          <div className="space-y-4">
                              <div className="flex gap-3 bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                  <div className="text-sm text-orange-200">
                                      <p className="font-bold mb-1">您正在分享历史版本 (v{shareState.video.version})</p>
                                      <p className="opacity-80 text-xs">该视频不是最新版本。为了避免客户审阅错误的文件，强制分享需要填写说明。</p>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">分享原因 / 说明</label>
                                  <textarea 
                                      className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg p-3 text-sm ${theme.text.secondary} focus:border-indigo-500 outline-none resize-none h-24 placeholder-zinc-600`}
                                      placeholder="请说明为什么需要分享旧版本..."
                                      value={shareState.justification}
                                      onChange={(e) => setShareState(prev => ({ ...prev, justification: e.target.value }))}
                                  />
                              </div>
                              <div className="flex justify-end pt-2">
                                  <button 
                                    disabled={!shareState.justification.trim()}
                                    onClick={() => setShareState(prev => ({ ...prev, step: 'config' }))}
                                    className="bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                      下一步
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* STEP 2: CONFIG */}
                      {shareState.step === 'config' && (
                          <div className="space-y-6">
                              <div className={`flex items-center gap-3 p-3 ${theme.bg.primary} rounded border ${theme.border.primary}`}>
                                  <FileVideo className="w-8 h-8 text-indigo-500" />
                                  <div className="min-w-0">
                                      <div className="text-sm text-zinc-200 truncate">{shareState.video.name}</div>
                                      <div className="text-xs text-zinc-500">v{shareState.video.version} • {shareState.video.size}</div>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-zinc-300">
                                          <Download className="w-4 h-4 text-zinc-500" />
                                          <span className="text-sm">允许下载源文件</span>
                                      </div>
                                      <button 
                                        onClick={() => setShareState(prev => ({ ...prev, allowDownload: !prev.allowDownload }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${shareState.allowDownload ? 'bg-indigo-600' : theme.bg.active}`}
                                      >
                                          <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${shareState.allowDownload ? 'left-6' : 'left-1'}`} />
                                      </button>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-zinc-300">
                                          <Lock className="w-4 h-4 text-zinc-500" />
                                          <span className="text-sm">密码保护</span>
                                      </div>
                                      <button 
                                        onClick={() => setShareState(prev => ({ ...prev, hasPassword: !prev.hasPassword, password: '' }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${shareState.hasPassword ? 'bg-indigo-600' : theme.bg.active}`}
                                      >
                                          <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${shareState.hasPassword ? 'left-6' : 'left-1'}`} />
                                      </button>
                                  </div>

                                  {shareState.hasPassword && (
                                      <div>
                                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">密码</label>
                                          <input 
                                              type="password"
                                              className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg p-3 text-sm ${theme.text.secondary} focus:border-indigo-500 outline-none`}
                                              placeholder="请输入密码"
                                              value={shareState.password}
                                              onChange={(e) => setShareState(prev => ({ ...prev, password: e.target.value }))}
                                          />
                                      </div>
                                  )}
                              </div>

                              {shareState.error && (
                                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-400">
                                      {shareState.error}
                                  </div>
                              )}

                              <div className="pt-2">
                                  <button 
                                    onClick={handleGenerateLink}
                                    disabled={shareState.isLoading || (shareState.hasPassword && !shareState.password.trim())}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-indigo-900/20 transition-all"
                                  >
                                      {shareState.isLoading ? '创建中...' : '创建分享链接'}
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* STEP 3: SUCCESS */}
                      {shareState.step === 'success' && (
                          <div className="space-y-6 text-center py-2">
                              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <CheckCircle2 className="w-6 h-6" />
                              </div>
                              <div>
                                  <h4 className="text-lg font-semibold text-zinc-100">链接已生成</h4>
                                  <p className="text-sm text-zinc-500 mt-1">此链接有效期为 7 天</p>
                              </div>

                              <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={shareState.generatedLink}
                                    className={`flex-1 ${theme.bg.primary} border ${theme.border.primary} rounded-lg px-3 py-2 text-sm ${theme.text.tertiary} outline-none`}
                                  />
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(shareState.generatedLink)}
                                    className={`p-2 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.secondary} rounded-lg transition-colors`}
                                    title="复制"
                                  >
                                      <Copy className="w-4 h-4" />
                                  </button>
                              </div>

                              <button 
                                onClick={() => setShareState(prev => ({ ...prev, isOpen: false }))}
                                className="text-sm text-zinc-500 hover:text-zinc-300"
                              >
                                  关闭窗口
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  // 资源管理器视图：Mac Finder 风格的网格卡片视图
  const renderFileExplorerView = () => {
    const moduleProjects = getModuleProjects();
    const filteredProjects = searchTerm 
      ? moduleProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : moduleProjects;
    const groupedProjects = groupProjectsByGroup(filteredProjects);
    const groupNames = Object.keys(groupedProjects).sort();
    
    // 第三层：显示项目内的视频
    if (explorerView === 'videos' && selectedProjectId) {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (!selectedProject) {
        navigateBack();
        return null;
      }
      
      const projectVideos = videos.filter(v => v.projectId === selectedProjectId);
      const groups = groupVideosBySeries(projectVideos);
      const seriesNames = Object.keys(groups).sort();
      
      if (seriesNames.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Film className="w-12 h-12 mb-4 opacity-20" />
            <p>该项目暂无视频。</p>
            <button
              onClick={navigateBack}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
            >
              返回
            </button>
          </div>
        );
      }
      
      // 显示视频（支持网格/列表视图）
      if (browserViewMode === 'list') {
        const latestVideos = seriesNames.map(name => {
          const versions = groups[name];
          return versions[0];
        });
        const gapClass = browserCardSize === 'small' ? 'gap-0.5' : browserCardSize === 'medium' ? 'gap-2' : 'gap-4';
        
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                返回
              </button>
              <h2 className="text-lg font-semibold text-zinc-200">{selectedProject.name}</h2>
            </div>
            <div className={`flex flex-col ${gapClass}`}>
              {latestVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  viewMode='list'
                  cardSize={browserCardSize}
                  activeModule={activeModule}
                  isInCart={cart.includes(video.id)}
                  isLatest={true}
                  isDeliveryDelivered={activeModule === 'delivery' && selectedProject.status === 'delivered'}
                  isSelected={activeModule === 'delivery' && selectedProject.status === 'delivered' ? selectedDeliveryFiles.includes(video.id) : false}
                  matchedTags={getMatchedTagsForVideo(video)}
                  onThumbnailClick={() => {
                    if (activeModule === 'delivery' || activeModule === 'showcase') {
                      setPreviewVideoId(video.id);
                    } else {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                      dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                    }
                  }}
                  onBodyClick={() => {
                    if (activeModule !== 'review') {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                    }
                  }}
                  onToggleCart={() => dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                  onShare={() => handleShareClick(video, true)}
                  onToggleSelection={activeModule === 'delivery' && selectedProject.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                />
              ))}
            </div>
          </div>
        );
      }
      
      // 网格视图 - 视频
      const cardWidthClass = 
        browserCardSize === 'small' ? 'min-w-[180px] max-w-[180px]' : 
        browserCardSize === 'medium' ? 'min-w-[280px] max-w-[280px]' : 
        'min-w-[420px] max-w-[420px]';
      const rowGapClass = 
        browserCardSize === 'small' ? 'gap-6' : 
        browserCardSize === 'medium' ? 'gap-10' : 
        'gap-14';
      
      return (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              返回
            </button>
            <h2 className="text-lg font-semibold text-zinc-200">{selectedProject.name}</h2>
          </div>
          <div className={`flex flex-col ${rowGapClass}`}>
            {seriesNames.map(name => {
              const versions = groups[name];
              const latestVersionId = versions[0].id;
              return (
                <div key={name} className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 mb-3 border-b border-zinc-800/50 pb-2">
                    <FileVideo className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-medium text-zinc-200 tracking-tight">{name}</h3>
                    <span className={`text-[10px] ${theme.text.muted} ${theme.bg.secondary} px-2 py-0.5 rounded-full border ${theme.border.primary}`}>
                      {versions.length} 个版本
                    </span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {versions.map((video) => (
                      <div key={video.id} className={cardWidthClass}>
                        <VideoCard
                          video={video}
                          viewMode='grid'
                          cardSize={browserCardSize}
                          activeModule={activeModule}
                          isInCart={cart.includes(video.id)}
                          isLatest={video.id === latestVersionId}
                          isDeliveryDelivered={activeModule === 'delivery' && selectedProject.status === 'delivered'}
                          isSelected={activeModule === 'delivery' && selectedProject.status === 'delivered' ? selectedDeliveryFiles.includes(video.id) : false}
                          matchedTags={getMatchedTagsForVideo(video)}
                          onThumbnailClick={() => {
                            if (activeModule === 'delivery' || activeModule === 'showcase') {
                              setPreviewVideoId(video.id);
                            } else {
                              dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                            }
                          }}
                          onBodyClick={() => {
                    if (activeModule !== 'review') {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                    }
                  }}
                          onToggleCart={() => dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                          onShare={() => handleShareClick(video, video.id === latestVersionId)}
                          onToggleSelection={activeModule === 'delivery' && selectedProject.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // 处理单击/双击逻辑
    const handleItemClick = (id: string, onDoubleClick: () => void) => {
      const now = Date.now();
      if (lastClickTime && lastClickTime.id === id && now - lastClickTime.time < 300) {
        // 双击
        onDoubleClick();
        setLastClickTime(null);
      } else {
        // 单击 - 切换选中状态
        setSelectedItems(prev => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        setLastClickTime({ id, time: now });
        setTimeout(() => setLastClickTime(null), 300);
      }
    };
    
    // 切换展开/折叠
    const toggleExpand = (id: string) => {
      setExpandedItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };
    
    // 第二层：显示组内的项目
    if (explorerView === 'projects' && selectedGroupName) {
      const groupProjects = groupedProjects[selectedGroupName] || [];
      
      if (groupProjects.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Folder className="w-12 h-12 mb-4 opacity-20" />
            <p>该组暂无项目。</p>
            <button
              onClick={navigateBack}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
            >
              返回
            </button>
          </div>
        );
      }
      
      // 列表视图 - Mac Finder 风格
      if (browserViewMode === 'list') {
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                返回
              </button>
              <h2 className="text-lg font-semibold text-zinc-200">{selectedGroupName}</h2>
            </div>
            <div className="space-y-1">
              {/* 新建项目按钮 - 仅审阅模块 */}
              {activeModule === 'review' && (
                <div className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg mb-2`}>
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: selectedGroupName });
                      dispatch({ type: 'SET_WORKBENCH_CREATE_MODE', payload: 'project' });
                      dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                    }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-zinc-800/50 transition-colors text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新建项目</span>
                  </button>
                </div>
              )}
              {groupProjects.map(project => {
                const projectVideos = videos.filter(v => v.projectId === project.id);
                const isExpanded = expandedItems.has(project.id);
                const isSelected = selectedItems.has(project.id);
                
                return (
                  <div key={project.id} className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg overflow-hidden`}>
                    <div
                      className={`flex items-center gap-2 ${browserCardSize === 'small' ? 'px-2 py-1.5' : browserCardSize === 'medium' ? 'px-3 py-2' : 'px-4 py-2.5'} cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                        isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                      }`}
                      onClick={() => handleItemClick(project.id, () => navigateToProject(project.id))}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(project.id);
                        }}
                        className="p-0.5 hover:bg-zinc-700 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-4.5 h-4.5'} text-zinc-400`} />
                        ) : (
                          <ChevronRight className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-4.5 h-4.5'} text-zinc-400`} />
                        )}
                      </button>
                      <Folder className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-5 h-5'} text-indigo-500`} />
                      <span className={`${browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base'} flex-1 ${isSelected ? 'text-indigo-300' : theme.text.secondary}`}>
                        {project.name}
                      </span>
                      <span className={`${browserCardSize === 'small' ? 'text-[10px]' : 'text-xs'} ${theme.text.muted}`}>
                        {projectVideos.length} 个视频
                      </span>
                      {activeModule === 'review' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                            dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                          }}
                          className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 hover:opacity-100 transition-opacity"
                          title="上传视频"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {isExpanded && projectVideos.length > 0 && (
                      <div className="border-t border-zinc-800 pl-8">
                        {projectVideos.map(video => {
                          const isVideoSelected = selectedItems.has(video.id);
                          const paddingClass = browserCardSize === 'small' ? 'px-2 py-1' : browserCardSize === 'medium' ? 'px-3 py-1.5' : 'px-4 py-2';
                          const textSizeClass = browserCardSize === 'small' ? 'text-[10px]' : browserCardSize === 'medium' ? 'text-xs' : 'text-sm';
                          const iconSizeClass = browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4';
                          return (
                            <div
                              key={video.id}
                              onClick={() => handleItemClick(video.id, () => {
                                if (activeModule === 'delivery' || activeModule === 'showcase') {
                                  setPreviewVideoId(video.id);
                                } else {
                                  dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                                  dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                                }
                              })}
                              className={`flex items-center gap-2 ${paddingClass} cursor-pointer hover:bg-zinc-800/30 transition-colors ${
                                isVideoSelected ? 'bg-indigo-500/10' : ''
                              }`}
                            >
                              <FileVideo className={`${iconSizeClass} text-zinc-500`} />
                              <span className={`${textSizeClass} flex-1 ${isVideoSelected ? 'text-indigo-300' : theme.text.muted}`}>
                                {video.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      
      // 网格视图 - 项目卡片
      return (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              返回
            </button>
            <h2 className="text-lg font-semibold text-zinc-200">{selectedGroupName}</h2>
            <span className={`text-xs ${theme.text.muted} ${theme.bg.secondary} px-2 py-0.5 rounded-full`}>
              {groupProjects.length} 个项目
            </span>
          </div>
          <div className={`grid ${
            browserCardSize === 'small' 
              ? 'gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
              : browserCardSize === 'medium' 
              ? 'gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
              : 'gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          }`}>
            {/* 新建项目按钮 - 仅审阅模块 */}
            {activeModule === 'review' && (
              <div
                onClick={() => {
                  dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: selectedGroupName });
                  dispatch({ type: 'SET_WORKBENCH_CREATE_MODE', payload: 'project' });
                  dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                }}
                className={`group relative ${browserCardSize === 'small' ? 'p-2' : browserCardSize === 'medium' ? 'p-3' : 'p-4'} ${theme.bg.secondary} border-2 border-dashed ${theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col items-center justify-center text-center min-h-[120px]`}
              >
                <div className={`${browserCardSize === 'small' ? 'w-12 h-12 mb-2' : browserCardSize === 'medium' ? 'w-14 h-14 mb-2.5' : 'w-16 h-16 mb-3'} flex items-center justify-center bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors`}>
                  <Plus className={`${browserCardSize === 'small' ? 'w-6 h-6' : browserCardSize === 'medium' ? 'w-7 h-7' : 'w-8 h-8'} text-indigo-500`} />
                </div>
                <h3 className={`${browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base'} font-medium ${theme.text.secondary} group-hover:text-indigo-300 transition-colors`}>
                  新建项目
                </h3>
              </div>
            )}
            {groupProjects.map(project => {
              const projectVideosCount = videos.filter(v => v.projectId === project.id).length;
              const isSelected = selectedItems.has(project.id);
              const paddingClass = browserCardSize === 'small' ? 'p-2' : browserCardSize === 'medium' ? 'p-3' : 'p-4';
              const iconContainerClass = browserCardSize === 'small' ? 'w-12 h-12 mb-2' : browserCardSize === 'medium' ? 'w-14 h-14 mb-2.5' : 'w-16 h-16 mb-3';
              const iconSizeClass = browserCardSize === 'small' ? 'w-6 h-6' : browserCardSize === 'medium' ? 'w-7 h-7' : 'w-8 h-8';
              const titleSizeClass = browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base';
              const metaSizeClass = browserCardSize === 'small' ? 'text-[10px]' : 'text-xs';
              return (
                <div
                  key={project.id}
                  onClick={() => handleItemClick(project.id, () => navigateToProject(project.id))}
                  className={`group relative ${paddingClass} ${theme.bg.secondary} border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col items-center text-center`}
                >
                  <div className={`${iconContainerClass} flex items-center justify-center bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors`}>
                    <FileVideo className={`${iconSizeClass} text-indigo-500`} />
                  </div>
                  <h3 className={`${titleSizeClass} font-medium mb-1 truncate w-full ${isSelected ? 'text-indigo-300' : theme.text.secondary} group-hover:text-indigo-300 transition-colors`} title={project.name}>
                    {project.name}
                  </h3>
                  <div className={`${metaSizeClass} text-zinc-500 mb-1 truncate w-full`} title={project.client}>
                    {project.client}
                  </div>
                  <div className={`${metaSizeClass} text-zinc-600 mt-auto`}>
                    {projectVideosCount} 个视频
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // 第一层：显示所有组
    if (groupNames.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <Folder className="w-12 h-12 mb-4 opacity-20" />
          <p>暂无项目</p>
        </div>
      );
    }
    
    // 列表视图 - Mac Finder 风格
    if (browserViewMode === 'list') {
      return (
        <div className="space-y-1">
          {activeModule === 'review' && (
            <div className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg mb-2`}>
              <button
                onClick={() => {
                  dispatch({ type: 'SET_WORKBENCH_CREATE_MODE', payload: 'group' });
                  dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                }}
                className="flex items-center gap-2 px-3 py-2 w-full hover:bg-zinc-800/50 transition-colors text-sm text-zinc-400 hover:text-zinc-200"
              >
                <Plus className="w-4 h-4" />
                <span>新建组</span>
              </button>
            </div>
          )}
          {groupNames.map(groupName => {
            const groupProjects = groupedProjects[groupName];
            const isExpanded = expandedItems.has(`group_${groupName}`);
            const isSelected = selectedItems.has(`group_${groupName}`);
            
            return (
              <div key={groupName} className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg overflow-hidden`}>
                <div
                  className={`flex items-center gap-2 ${browserCardSize === 'small' ? 'px-2 py-1.5' : browserCardSize === 'medium' ? 'px-3 py-2' : 'px-4 py-2.5'} cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                    isSelected ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                  }`}
                  onClick={() => handleItemClick(`group_${groupName}`, () => navigateToGroup(groupName))}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(`group_${groupName}`);
                    }}
                    className="p-0.5 hover:bg-zinc-700 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-4.5 h-4.5'} text-zinc-400`} />
                    ) : (
                      <ChevronRight className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-4.5 h-4.5'} text-zinc-400`} />
                    )}
                  </button>
                  <Folder className={`${browserCardSize === 'small' ? 'w-3.5 h-3.5' : browserCardSize === 'medium' ? 'w-4 h-4' : 'w-5 h-5'} text-indigo-500`} />
                  <span className={`${browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base'} flex-1 ${isSelected ? 'text-indigo-300' : theme.text.secondary}`}>
                    {groupName}
                  </span>
                  <span className={`${browserCardSize === 'small' ? 'text-[10px]' : 'text-xs'} ${theme.text.muted}`}>
                    {groupProjects.length} 个项目
                  </span>
                  {activeModule === 'review' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupName(groupName);
                        dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: groupName });
                        dispatch({ type: 'SET_WORKBENCH_CREATE_MODE', payload: 'project' });
                        dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                      }}
                      className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 hover:opacity-100 transition-opacity"
                      title="新建项目"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t border-zinc-800 pl-8">
                    {groupProjects.map(project => {
                      const projectVideos = videos.filter(v => v.projectId === project.id);
                      const isProjectExpanded = expandedItems.has(project.id);
                      const isProjectSelected = selectedItems.has(project.id);
                      
                      return (
                        <div key={project.id} className="border-b border-zinc-800/50 last:border-b-0">
                          <div
                            className={`flex items-center gap-2 ${browserCardSize === 'small' ? 'px-2 py-1' : browserCardSize === 'medium' ? 'px-3 py-1.5' : 'px-4 py-2'} cursor-pointer hover:bg-zinc-800/30 transition-colors ${
                              isProjectSelected ? 'bg-indigo-500/10' : ''
                            }`}
                            onClick={() => handleItemClick(project.id, () => {
                              dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                            })}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(project.id);
                              }}
                              className="p-0.5 hover:bg-zinc-700 rounded"
                            >
                              {isProjectExpanded ? (
                                <ChevronDown className={`${browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-zinc-500`} />
                              ) : (
                                <ChevronRight className={`${browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-zinc-500`} />
                              )}
                            </button>
                            <FileVideo className={`${browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-zinc-500`} />
                            <span className={`${browserCardSize === 'small' ? 'text-[10px]' : browserCardSize === 'medium' ? 'text-xs' : 'text-sm'} flex-1 ${isProjectSelected ? 'text-indigo-300' : theme.text.muted}`}>
                              {project.name}
                            </span>
                            <span className={`${browserCardSize === 'small' ? 'text-[10px]' : 'text-xs'} ${theme.text.muted}`}>
                              {projectVideos.length} 个视频
                            </span>
                            {activeModule === 'review' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                                  dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                                }}
                                className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 hover:opacity-100 transition-opacity"
                                title="上传视频"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {isProjectExpanded && projectVideos.length > 0 && (
                            <div className="pl-8">
                              {projectVideos.map(video => {
                                const isVideoSelected = selectedItems.has(video.id);
                                const paddingClass = browserCardSize === 'small' ? 'px-2 py-0.5' : browserCardSize === 'medium' ? 'px-3 py-1' : 'px-4 py-1.5';
                                const textSizeClass = browserCardSize === 'small' ? 'text-[10px]' : browserCardSize === 'medium' ? 'text-xs' : 'text-sm';
                                const iconSizeClass = browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4';
                                return (
                                  <div
                                    key={video.id}
                                    onClick={() => handleItemClick(video.id, () => {
                                      if (activeModule === 'delivery' || activeModule === 'showcase') {
                                        setPreviewVideoId(video.id);
                                      } else {
                                        dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                                        dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                                      }
                                    })}
                                    className={`flex items-center gap-2 ${paddingClass} cursor-pointer hover:bg-zinc-800/20 transition-colors ${
                                      isVideoSelected ? 'bg-indigo-500/10' : ''
                                    }`}
                                  >
                                    <FileVideo className={`${iconSizeClass} text-zinc-600`} />
                                    <span className={`${textSizeClass} flex-1 ${isVideoSelected ? 'text-indigo-300' : theme.text.muted}`}>
                                      {video.name}
                                    </span>
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
            );
          })}
        </div>
      );
    }
    
    // 网格视图 - 组卡片（Mac Finder 风格）
    return (
      <div className={`grid ${
        browserCardSize === 'small' 
          ? 'gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
          : browserCardSize === 'medium' 
          ? 'gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
          : 'gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
      }`}>
        {/* 新建组按钮 - 仅审阅模块 */}
        {activeModule === 'review' && (
          <div
            onClick={() => {
              dispatch({ type: 'SET_WORKBENCH_CREATE_MODE', payload: 'group' });
              dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
            }}
            className={`group relative ${browserCardSize === 'small' ? 'p-2' : browserCardSize === 'medium' ? 'p-3' : 'p-4'} ${theme.bg.secondary} border-2 border-dashed ${theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col items-center justify-center text-center min-h-[120px]`}
          >
            <div className={`${browserCardSize === 'small' ? 'w-12 h-12 mb-2' : browserCardSize === 'medium' ? 'w-14 h-14 mb-2.5' : 'w-16 h-16 mb-3'} flex items-center justify-center bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors`}>
              <Plus className={`${browserCardSize === 'small' ? 'w-6 h-6' : browserCardSize === 'medium' ? 'w-7 h-7' : 'w-8 h-8'} text-indigo-500`} />
            </div>
            <h3 className={`${browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base'} font-medium ${theme.text.secondary} group-hover:text-indigo-300 transition-colors`}>
              新建组
            </h3>
          </div>
        )}
        {groupNames.map(groupName => {
          const groupProjects = groupedProjects[groupName];
          const totalVideos = groupProjects.reduce((sum, p) => sum + videos.filter(v => v.projectId === p.id).length, 0);
          const isSelected = selectedItems.has(`group_${groupName}`);
          const paddingClass = browserCardSize === 'small' ? 'p-2' : browserCardSize === 'medium' ? 'p-3' : 'p-4';
          const iconContainerClass = browserCardSize === 'small' ? 'w-12 h-12 mb-2' : browserCardSize === 'medium' ? 'w-14 h-14 mb-2.5' : 'w-16 h-16 mb-3';
          const iconSizeClass = browserCardSize === 'small' ? 'w-6 h-6' : browserCardSize === 'medium' ? 'w-7 h-7' : 'w-8 h-8';
          const titleSizeClass = browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base';
          const metaSizeClass = browserCardSize === 'small' ? 'text-[10px]' : 'text-xs';
          
          return (
            <div
              key={groupName}
              onClick={() => handleItemClick(`group_${groupName}`, () => navigateToGroup(groupName))}
              className={`group relative ${paddingClass} ${theme.bg.secondary} border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col items-center text-center`}
            >
              <div className={`${iconContainerClass} flex items-center justify-center bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors`}>
                <Folder className={`${iconSizeClass} text-indigo-500`} />
              </div>
              <h3 className={`${titleSizeClass} font-medium mb-1 truncate w-full ${isSelected ? 'text-indigo-300' : theme.text.secondary} group-hover:text-indigo-300 transition-colors`} title={groupName}>
                {groupName}
              </h3>
              <div className={`${metaSizeClass} text-zinc-500 mb-1`}>
                {groupProjects.length} 个项目
              </div>
              <div className={`${metaSizeClass} text-zinc-600 mt-auto`}>
                {totalVideos} 个视频
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
      // 如果面板隐藏，显示资源管理器视图（按组显示项目）
      if (!isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase')) {
          return renderFileExplorerView();
      }
      
      // 审阅模块：切换到分享记录视图
      if (activeModule === 'review' && reviewViewMode === 'packages') {
        return renderReviewShareLinks();
      }
      // 交付模块：切换到分享记录视图
      if (activeModule === 'delivery' && deliveryViewMode === 'packages') {
        return renderDeliveryPackages();
      }
      // 案例模块：切换到案例包视图
      if (activeModule === 'showcase' && state.showcaseViewMode === 'packages') {
        return renderShowcasePackages();
      }

      const groups = groupVideosBySeries(displayVideos);
      const seriesNames = Object.keys(groups).sort();

      if (seriesNames.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                  <Film className="w-12 h-12 mb-4 opacity-20" />
                  <p>该项目暂无视频。</p>
              </div>
          );
      }

      if (browserViewMode === 'list') {
          // In list view, only show the latest version (First in the sorted array because we sorted descending)
          const latestVideos = seriesNames.map(name => {
              const versions = groups[name];
              return versions[0]; 
          });

          // List Gap
          const gapClass = browserCardSize === 'small' ? 'gap-0.5' : browserCardSize === 'medium' ? 'gap-2' : 'gap-4';

          return (
              <div className={`flex flex-col ${gapClass}`}>
                  {latestVideos.map((video) => (
                      <VideoCard 
                          key={video.id} 
                          video={video} 
                          viewMode='list'
                          cardSize={browserCardSize}
                          activeModule={activeModule}
                          isInCart={cart.includes(video.id)}
                          isLatest={true}
                          isDeliveryDelivered={activeModule === 'delivery' && !!project && project.status === 'delivered'}
                          isSelected={activeModule === 'delivery' && project && project.status === 'delivered' ? selectedDeliveryFiles.includes(video.id) : false}
                          matchedTags={getMatchedTagsForVideo(video)}
                          onThumbnailClick={() => {
                            if (activeModule === 'delivery' || activeModule === 'showcase') {
                              setPreviewVideoId(video.id);
                            } else {
                              dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                            }
                          }}
                          onBodyClick={() => {
                    if (activeModule !== 'review') {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                    }
                  }}
                          onToggleCart={() => dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                          onShare={() => handleShareClick(video, true)}
                          onToggleSelection={activeModule === 'delivery' && project && project.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                      />
                  ))}
              </div>
          );
      }

      // Grid Mode
      const cardWidthClass = 
        browserCardSize === 'small' ? 'min-w-[180px] max-w-[180px]' : 
        browserCardSize === 'medium' ? 'min-w-[280px] max-w-[280px]' : 
        'min-w-[420px] max-w-[420px]';
      
      const rowGapClass = 
         browserCardSize === 'small' ? 'gap-6' : 
         browserCardSize === 'medium' ? 'gap-10' : 
         'gap-14';

      return (
          <div className={`flex flex-col ${rowGapClass}`}>
              {seriesNames.map(name => {
                  const versions = groups[name];
                  const latestVersionId = versions[0].id; // First is latest due to Descending sort

                  return (
                    <div key={name} className="animate-in fade-in duration-500 slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 mb-3 border-b border-zinc-800/50 pb-2">
                            <FileVideo className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-base font-medium text-zinc-200 tracking-tight">{name}</h2>
                            <span className={`text-[10px] ${theme.text.muted} ${theme.bg.secondary} px-2 py-0.5 rounded-full border ${theme.border.primary}`}>
                                {versions.length} 个版本
                            </span>
                        </div>
                        
                        {/* Horizontal Version Scroll/Grid */}
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                            {versions.map((video) => (
                                <div key={video.id} className={cardWidthClass}>
                                    <VideoCard 
                                        video={video} 
                                        viewMode='grid'
                                        cardSize={browserCardSize}
                                        activeModule={activeModule}
                                        isInCart={cart.includes(video.id)}
                                        isLatest={video.id === latestVersionId}
                                        isDeliveryDelivered={activeModule === 'delivery' && !!project && project.status === 'delivered'}
                                        isSelected={activeModule === 'delivery' && project && project.status === 'delivered' ? selectedDeliveryFiles.includes(video.id) : false}
                                        matchedTags={getMatchedTagsForVideo(video)}
                                        onThumbnailClick={() => {
                                          if (activeModule === 'delivery' || activeModule === 'showcase') {
                                            setPreviewVideoId(video.id);
                                          } else {
                                            dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                                            dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                                            // 视频会自动播放（在 ReviewOverlay 中实现）
                                          }
                                        }}
                                        onBodyClick={() => {
                                          if (activeModule !== 'review') {
                                            dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                                          }
                                        }}
                                        onToggleCart={() => dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                                        onShare={() => handleShareClick(video, video.id === latestVersionId)}
                                        onToggleSelection={activeModule === 'delivery' && project && project.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                  );
              })}
          </div>
      );
  };

  return (
    <main className={marginClass}>
      <div className="sticky top-14 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 mb-6 flex items-center justify-between min-w-0">
        <div className="min-w-0 flex-shrink">
          {renderHeader()}
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
             {project && activeModule === 'review' && reviewViewMode === 'files' && (
                <div className="text-xs text-zinc-500 mr-2">
                    <span className="text-zinc-300">{displayVideos.length}</span> 个视频文件
                </div>
            )}


            {/* View Toggles */}
            <div className={`flex items-center gap-1 rounded-lg p-1 ${theme.bg.secondary} border ${theme.border.primary}`}>
                <button 
                    onClick={() => dispatch({ type: 'SET_BROWSER_VIEW_MODE', payload: 'grid' })}
                    className={`${showButtonText ? 'px-3' : 'px-2'} py-1.5 rounded-md transition-all flex items-center ${showButtonText ? 'gap-1.5' : 'gap-0'} text-xs font-medium ${
                        browserViewMode === 'grid' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="卡片视图"
                >
                    <LayoutGrid className={`w-4 h-4 ${browserViewMode === 'grid' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
                    {showButtonText && <span>卡片</span>}
                </button>
                <button 
                    onClick={() => dispatch({ type: 'SET_BROWSER_VIEW_MODE', payload: 'list' })}
                    className={`${showButtonText ? 'px-3' : 'px-2'} py-1.5 rounded-md transition-all flex items-center ${showButtonText ? 'gap-1.5' : 'gap-0'} text-xs font-medium ${
                        browserViewMode === 'list' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="列表视图"
                >
                    <List className={`w-4 h-4 ${browserViewMode === 'list' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
                    {showButtonText && <span>列表</span>}
                </button>
            </div>

            {/* Size Settings - Three buttons horizontal */}
            <div className={`flex items-center gap-1 rounded-lg p-1 ${theme.bg.secondary} border ${theme.border.primary}`}>
                <button 
                    onClick={() => dispatch({type: 'SET_BROWSER_CARD_SIZE', payload: 'small'})}
                    className={`px-2 py-1.5 rounded-md transition-all text-xs font-medium ${
                        browserCardSize === 'small' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="小尺寸"
                >
                    S
                </button>
                <button 
                    onClick={() => dispatch({type: 'SET_BROWSER_CARD_SIZE', payload: 'medium'})}
                    className={`px-2 py-1.5 rounded-md transition-all text-xs font-medium ${
                        browserCardSize === 'medium' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="中尺寸"
                >
                    M
                </button>
                <button 
                    onClick={() => dispatch({type: 'SET_BROWSER_CARD_SIZE', payload: 'large'})}
                    className={`px-2 py-1.5 rounded-md transition-all text-xs font-medium ${
                        browserCardSize === 'large' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="大尺寸"
                >
                    L
                </button>
            </div>
        </div>
      </div>

      <div className="px-6 pb-20">
         {renderContent()}
      </div>

      {/* RENDER SHARE MODAL */}
      {renderShareModal()}

      {/* RENDER PREVIEW PLAYER for Delivery and Showcase modules */}
      {previewVideoId && (activeModule === 'delivery' || activeModule === 'showcase') && (() => {
        const previewVideo = videos.find(v => v.id === previewVideoId);
        return previewVideo ? (
          <PreviewPlayer 
            video={previewVideo} 
            onClose={() => setPreviewVideoId(null)} 
          />
        ) : null;
      })()}
    </main>
  );

  // 渲染审阅模块分享记录
  function renderReviewShareLinks() {
    if (reviewShareLinksLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <p className={`mt-4 text-sm ${theme.text.muted}`}>加载中...</p>
        </div>
      );
    }

    if (reviewShareLinks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className={`w-12 h-12 mb-4 opacity-20 ${theme.text.muted}`} />
          <p className={`text-sm ${theme.text.muted}`}>暂无分享记录</p>
        </div>
      );
    }

    const getShareUrl = (link: any) => {
      const baseUrl = window.location.origin;
      return `${baseUrl}/share/${link.token}`;
    };

    return (
      <div className="space-y-4">
        {reviewShareLinks.map((link) => (
          <div key={link.id} className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg p-6 hover:border-indigo-500/30 transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-base font-semibold ${theme.text.secondary}`}>
                    {link.video?.name || link.project?.name || '未命名分享'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    link.type === 'video_review' 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {link.type === 'video_review' ? '审阅链接' : '分享链接'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    link.is_active 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : `${theme.bg.tertiary} ${theme.text.muted} border ${theme.border.secondary}`
                  }`}>
                    {link.is_active ? '已启用' : '已停用'}
                  </span>
                </div>
                {link.justification && (
                  <p className={`text-sm ${theme.text.muted} mb-4`}>{link.justification}</p>
                )}
                <div className="flex items-center gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>创建时间：{new Date(link.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  {link.view_count !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>查看次数：{link.view_count || 0}</span>
                    </div>
                  )}
                  {link.download_count !== undefined && link.allow_download && (
                    <div className="flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>下载次数：{link.download_count || 0}</span>
                    </div>
                  )}
                  {link.expires_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>过期时间：{new Date(link.expires_at).toLocaleString('zh-CN')}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const updated = await sharesApi.toggle(link.id);
                    setReviewShareLinks(reviewShareLinks.map(l => l.id === link.id ? updated : l));
                  } catch (error) {
                    console.error('Failed to toggle share link:', error);
                    alert('操作失败');
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  link.is_active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                <Power className="w-4 h-4" />
                {link.is_active ? '停用链接' : '启用链接'}
              </button>
            </div>
            <div className={`pt-4 border-t ${theme.border.primary}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(link)}
                  className={`flex-1 ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} font-mono`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareUrl(link));
                    alert('链接已复制到剪贴板');
                  }}
                  className={`px-4 py-2 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.tertiary} rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Copy className="w-4 h-4" />
                  复制链接
                </button>
                <button
                  onClick={() => window.open(getShareUrl(link), '_blank')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  查看
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 渲染交付包记录
  function renderDeliveryPackages() {
    if (deliveryShareLinksLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <p className={`mt-4 text-sm ${theme.text.muted}`}>加载中...</p>
        </div>
      );
    }

    if (deliveryShareLinks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className={`w-12 h-12 mb-4 opacity-20 ${theme.text.muted}`} />
          <p className={`text-sm ${theme.text.muted}`}>暂无分享记录</p>
        </div>
      );
    }

    const getShareUrl = (link: any) => {
      const baseUrl = window.location.origin;
      return `${baseUrl}/share/${link.token}`;
    };

    return (
      <div className="space-y-4">
        {deliveryShareLinks.map((link) => (
          <div key={link.id} className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg p-6 hover:border-indigo-500/30 transition-colors`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-base font-semibold ${theme.text.secondary}`}>
                    {link.delivery_package?.title || link.project?.name || '未命名分享'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30`}>
                    交付链接
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    link.is_active 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : `${theme.bg.tertiary} ${theme.text.muted} border ${theme.border.secondary}`
                  }`}>
                    {link.is_active ? '已启用' : '已停用'}
                  </span>
                </div>
                {link.delivery_package?.description && (
                  <p className={`text-sm ${theme.text.muted} mb-4`}>{link.delivery_package.description}</p>
                )}
                <div className="flex items-center gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>创建时间：{new Date(link.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  {link.view_count !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>查看次数：{link.view_count || 0}</span>
                    </div>
                  )}
                  {link.download_count !== undefined && link.allow_download && (
                    <div className="flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>下载次数：{link.download_count || 0}</span>
                    </div>
                  )}
                  {link.expires_at && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>过期时间：{new Date(link.expires_at).toLocaleString('zh-CN')}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const updated = await sharesApi.toggle(link.id);
                    setDeliveryShareLinks(deliveryShareLinks.map(l => l.id === link.id ? updated : l));
                  } catch (error) {
                    console.error('Failed to toggle share link:', error);
                    alert('操作失败');
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  link.is_active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                <Power className="w-4 h-4" />
                {link.is_active ? '停用链接' : '启用链接'}
              </button>
            </div>
            <div className={`pt-4 border-t ${theme.border.primary}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(link)}
                  className={`flex-1 ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} font-mono`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareUrl(link));
                    alert('链接已复制到剪贴板');
                  }}
                  className={`px-4 py-2 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.tertiary} rounded-lg text-sm transition-colors flex items-center gap-2`}
                >
                  <Copy className="w-4 h-4" />
                  复制链接
                </button>
                <button
                  onClick={() => window.open(getShareUrl(link), '_blank')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  查看
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 渲染案例包记录
  function renderShowcasePackages() {
    const packages = state.showcasePackages || [];
    if (packages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <Package className="w-12 h-12 mb-4 opacity-20" />
          <p>暂无案例包记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-zinc-200">{pkg.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    pkg.mode === 'quick_player' 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}>
                    {pkg.mode === 'quick_player' ? '快速分享' : '提案微站'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    pkg.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }`}>
                    {pkg.isActive ? '已启用' : '已停用'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mb-4">{pkg.description}</p>
                <div className="flex items-center gap-6 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>创建时间：{new Date(pkg.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>查看次数：{pkg.viewCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5" />
                    <span>包含文件：{pkg.items.length} 个</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_SHOWCASE_PACKAGE', payload: { packageId: pkg.id, isActive: !pkg.isActive } })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  pkg.isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                <Power className="w-4 h-4" />
                {pkg.isActive ? '停用链接' : '启用链接'}
              </button>
            </div>
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pkg.link}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(pkg.link)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  复制链接
                </button>
                <button
                  onClick={() => window.open(pkg.link, '_blank')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  查看
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
};

const VideoCard: React.FC<{ 
    video: Video; 
    viewMode: 'grid' | 'list';
    cardSize: 'small' | 'medium' | 'large';
    activeModule: string;
    isInCart: boolean;
    isLatest: boolean;
    isSelected?: boolean; // 交付模块选中状态
    isDeliveryDelivered?: boolean; // 交付模块是否已交付状态
    onThumbnailClick: () => void;
    onBodyClick: () => void;
    onToggleCart: () => void;
    onShare: () => void;
    onToggleSelection?: () => void; // 交付模块选择切换
}> = ({ 
    video, 
    viewMode, 
    cardSize, 
    activeModule, 
    isInCart, 
    isLatest, 
    isSelected = false, 
    isDeliveryDelivered = false,
    matchedTags = [],
    onThumbnailClick, 
    onBodyClick, 
    onToggleCart, 
    onShare,
    onToggleSelection 
}) => {
  
  if (viewMode === 'list') {
      // LIST VIEW
      const containerClass = 
        cardSize === 'small' ? 'py-1 px-2 gap-3 h-[60px]' : 
        cardSize === 'medium' ? 'p-2 gap-4 h-[90px]' : 
        'p-4 gap-6 h-[180px]';
      
      const thumbClass = 
        cardSize === 'small' ? 'w-24 h-full' : 
        cardSize === 'medium' ? 'w-32 h-full' : 
        'aspect-video h-full'; 
      
      const fontSize = cardSize === 'small' ? 'text-xs' : cardSize === 'medium' ? 'text-sm' : 'text-base';
      const metaFontSize = cardSize === 'small' ? 'text-[10px]' : 'text-xs';

      return (
        <div 
          onClick={onBodyClick}
          className={`group flex items-center bg-zinc-900/50 border rounded overflow-hidden transition-all cursor-pointer hover:bg-zinc-900
            ${isInCart ? 'border-indigo-500/50 bg-indigo-500/5' : ''}
            ${isSelected ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
            ${!isInCart && !isSelected ? 'border-zinc-800/50 hover:border-zinc-700' : ''}
            ${containerClass}
          `}
        >
             {/* Thumbnail */}
            <div className={`relative ${thumbClass} bg-zinc-800 rounded-sm overflow-hidden shrink-0`}>
                <img 
                    src={`https://picsum.photos/seed/${video.id}/200/112`} 
                    alt="Thumbnail" 
                    className="w-full h-full object-cover opacity-80"
                />
                 <div onClick={(e) => { e.stopPropagation(); onThumbnailClick(); }} className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center group/play transition-colors">
                     <Play className={`${cardSize === 'small' ? 'w-4 h-4' : 'w-8 h-8'} text-white opacity-0 group-hover/play:opacity-100 drop-shadow-lg`} />
                 </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4 h-full">
                <div className="flex flex-col justify-center min-w-0 h-full">
                    <h3 className={`${fontSize} font-medium text-zinc-200 truncate`} title={video.name}>{video.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`${metaFontSize} text-zinc-500`}>v{video.version}</span>
                        {video.status === 'annotated' && (
                          <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-1.5 rounded">
                            {video.annotationCount && video.annotationCount > 0 ? `批注*${video.annotationCount}` : '已批注'}
                          </span>
                        )}
                        {video.status === 'approved' && <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 rounded">已通过</span>}
                        
                        {cardSize !== 'small' && video.changeLog && (
                             <span className={`${metaFontSize} text-zinc-500 truncate max-w-[300px] border-l border-zinc-700 pl-2 ml-1 opacity-70`}>{video.changeLog}</span>
                        )}
                        {/* 显示被命中的标签 */}
                        {matchedTags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {matchedTags.map(tagName => (
                              <span 
                                key={tagName}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                              >
                                {tagName}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-6 ${metaFontSize} text-zinc-500 shrink-0 ${cardSize === 'small' ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
                    {cardSize !== 'small' && <span className="w-16 text-right hidden sm:block">{video.resolution}</span>}
                    <span className="w-16 text-right">{video.size}</span>
                    <span className="w-16 text-right font-mono">{video.duration}</span>
                    <span className="w-24 text-right">{video.uploadTime}</span>
                </div>
            </div>

            {/* Action */}
             <div className="px-2 flex items-center gap-2">
                {isDeliveryDelivered && onToggleSelection ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                        className={`p-1.5 rounded transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                ) : activeModule !== 'showcase' ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                        className={`p-1.5 rounded transition-colors ${isLatest ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}
                        title={isLatest ? "对外分享" : "分享历史版本"}
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCart(); }}
                        className={`p-1.5 rounded transition-colors ${isInCart ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isInCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                )}
             </div>
        </div>
      );
  }

  // GRID VIEW
  const thumbHeight = 
    cardSize === 'small' ? 'h-24' : 
    cardSize === 'medium' ? 'h-36' : 
    'h-52'; 
  
  const fontSize = cardSize === 'small' ? 'text-xs' : 'text-sm';

  return (
    <div 
      onClick={onBodyClick}
      className={`group relative bg-zinc-900 border rounded-lg overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/50 flex flex-col h-full
        ${isInCart ? 'border-indigo-500 ring-1 ring-indigo-500/50' : ''}
        ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : ''}
        ${!isInCart && !isSelected ? 'border-zinc-800 hover:border-zinc-600' : ''}
      `}
    >
      {/* Thumbnail */}
      <div className={`relative ${thumbHeight} bg-zinc-800 w-full overflow-hidden shrink-0`}>
        <div onClick={(e) => { e.stopPropagation(); onThumbnailClick(); }} className="w-full h-full relative group/thumb">
             <img 
                src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/225`} 
                alt="Thumbnail" 
                className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('picsum.photos')) {
                    target.src = `https://picsum.photos/seed/${video.id}/400/225`;
                  }
                }}
            />
            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/40 transition-colors flex items-center justify-center">
                <div className={`rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 scale-75 group-hover/thumb:scale-100 transition-all duration-200 hover:bg-indigo-500 hover:text-white ${cardSize === 'small' ? 'w-8 h-8' : 'w-10 h-10'}`}>
                    <Play className={`${cardSize === 'small' ? 'w-3 h-3' : 'w-4 h-4'} fill-current pl-0.5`} />
                </div>
            </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
            {/* 案例模块中，所有视频都不显示版本号 */}
            {activeModule !== 'showcase' && (
                <span className="bg-black/70 backdrop-blur-md text-[10px] font-bold px-1.5 py-0.5 rounded text-zinc-200 border border-white/10">v{video.version}</span>
            )}
            {video.status === 'annotated' && (
              <span className="bg-indigo-500 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                {video.annotationCount && video.annotationCount > 0 ? `批注*${video.annotationCount}` : '已批注'}
              </span>
            )}
            {video.status === 'approved' && <span className="bg-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">已通过</span>}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-[10px] font-mono px-1.5 py-0.5 rounded text-zinc-200">
            {video.duration}
        </div>
      </div>

      {/* Info Body */}
      <div className={`flex-1 flex flex-col ${cardSize === 'small' ? 'p-2' : 'p-3'}`}>
        <div className="flex items-start justify-between mb-1">
            <h3 className={`font-medium text-zinc-200 truncate pr-2 group-hover:text-indigo-400 transition-colors ${fontSize}`} title={video.name}>{video.name}</h3>
            
            <div className="flex items-center gap-1">
                {isDeliveryDelivered && onToggleSelection ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                        className={`p-1 rounded transition-colors ${isSelected ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                ) : activeModule !== 'showcase' ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                        className={`p-1 rounded transition-colors ${isLatest ? 'text-indigo-400 hover:text-white hover:bg-indigo-500' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}
                        title={isLatest ? "对外分享" : "分享历史版本"}
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleCart(); }}
                        className={`p-1 rounded transition-colors ${isInCart ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {isInCart ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                )}
            </div>
        </div>
        
        {/* Change Log Preview */}
        {cardSize !== 'small' && (
            video.changeLog ? (
                <p className="text-[10px] text-zinc-500 line-clamp-3 bg-zinc-950/50 p-1.5 rounded mb-2 border border-zinc-800/50 min-h-[40px]">
                    {video.changeLog}
                </p>
            ) : (
                <p className="text-[10px] text-zinc-700 italic mb-2 min-h-[40px] flex items-center">无修改记录</p>
            )
        )}

        {/* 显示被命中的标签 */}
        {matchedTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {matchedTags.map(tagName => (
              <span 
                key={tagName}
                className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              >
                {tagName}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/50">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {video.uploadTime}</span>
            <span className="font-mono">{video.resolution || 'HD'}</span>
        </div>
      </div>
    </div>
  );
}
