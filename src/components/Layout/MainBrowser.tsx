
import React, { useState } from 'react';
import { Play, MoreVertical, Plus, Check, Clock, LayoutGrid, List, SlidersHorizontal, FileVideo, Film, CheckCircle2, Share2, AlertTriangle, Lock, Download, Copy, X, ArrowRight, Package, Power, Eye, ChevronRight, ChevronDown, Folder, Upload, Trash2, Calendar, Infinity, Link2, Settings, Edit2, Save, Loader2 } from 'lucide-react';
import { useStore } from '../../App';
import { Video, DeliveryPackage } from '../../types';
import { PreviewPlayer } from './PreviewPlayer';
import { sharesApi } from '../../api/shares';
import { showcaseApi } from '../../api/showcase';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useTeam } from '../../contexts/TeamContext';
import { toastManager } from '../../hooks/useToast';
import { ConfirmModal } from '../UI/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';

// 组图标组件 - 简约的多个文件夹叠加设计，细腻简约风格
const GroupIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* 背景文件夹 - 最淡 */}
      <path d="M3 6h11a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 3 6z" opacity="0.25" />
      <path d="M3 6V4.5a1.5 1.5 0 0 1 1.5-1.5h3.5l1.5 1.5h5a1.5 1.5 0 0 1 1.5 1.5" opacity="0.25" />
      {/* 中间文件夹 */}
      <path d="M4.5 7.5h11a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5v-9a1.5 1.5 0 0 1 1.5-1.5z" opacity="0.4" />
      <path d="M4.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3.5l1.5 1.5h5a1.5 1.5 0 0 1 1.5 1.5" opacity="0.4" />
      {/* 前景文件夹 - 最清晰 */}
      <path d="M6 9h11a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 6 9z" />
      <path d="M6 9V7.5a1.5 1.5 0 0 1 1.5-1.5h3.5l1.5 1.5h5a1.5 1.5 0 0 1 1.5 1.5" />
    </svg>
  );
};

// 项目图标组件 - 简约的单个文件夹设计，细腻简约风格
const ProjectIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 5.5h12a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V7a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M4 5.5V4a1.5 1.5 0 0 1 1.5-1.5h4l1.5 1.5h6a1.5 1.5 0 0 1 1.5 1.5" />
    </svg>
  );
};

/**
 * MainBrowser 主浏览区组件
 * 
 * 【重要】业务模块的两种工作模式：
 * 
 * 在审阅、交付、案例这三个主要业务模块下，有两种工作模式：
 * 
 * 1. 【检索模式】当 isRetrievalPanelVisible = true 时
 *    - 检索面板显示在左侧，提供项目列表、搜索、标签筛选等功能
 *    - 主浏览区显示选中项目的视频文件
 *    - 用户可以通过检索面板快速定位和筛选项目
 * 
 * 2. 【文件模式】当 isRetrievalPanelVisible = false 时
 *    - 检索面板隐藏，主浏览区占据更多空间
 *    - 主浏览区切换为资源管理器视图（renderFileExplorerView），按组/项目层级展示所有内容
 *    - 类似文件资源管理器，可以浏览整个项目结构
 *    - 适用于需要查看完整项目结构的场景
 * 
 * 【重要】文件模式的层级结构（全局注释）：
 * 
 * 文件模式采用三级层级结构，类似文件资源管理器：
 * 
 * 1. 【根目录】（第一层，explorerView === 'groups'）
 *    - 显示所有项目分组（组）
 *    - 每个组包含多个项目
 *    - 操作：新建组
 * 
 * 2. 【组目录】（第二层，explorerView === 'projects' && selectedGroupName）
 *    - 显示该组内的所有项目
 *    - 每个项目包含多个视频
 *    - 操作：新建项目（组默认为当前组）
 * 
 * 3. 【项目目录】（第三层，explorerView === 'videos' && selectedProjectId）
 *    - 显示该项目内的所有视频
 *    - 视频按系列分组显示（相同基础名称的不同版本）
 *    - 操作：上传视频（项目默认为当前项目）
 * 
 * 注意：当提到"组"、"项目"、"视频"时，它们分别对应这三个不同的层级。
 */
export const MainBrowser: React.FC = () => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { currentTeam } = useTeam();
  const { user } = useAuth();
  const { activeModule, showWorkbench, projects, selectedProjectId, selectedVideoId, videos, cart, searchTerm, browserViewMode, browserCardSize, reviewViewMode, deliveryViewMode, showcaseViewMode, deliveries, selectedDeliveryFiles, isRetrievalPanelVisible, selectedGroupTag, selectedGroupTags, isTagMultiSelectMode, tags } = state;
  const project = projects.find(p => p.id === selectedProjectId);
  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const delivery = deliveries.find(d => d.projectId === selectedProjectId);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set()); // 选中的文件/项目ID
  const [lastClickTime, setLastClickTime] = React.useState<{id: string, time: number} | null>(null); // 用于双击检测
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set()); // 展开的组/项目ID（列表模式）
  
  // 删除确认弹窗状态
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    video: Video | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    video: null,
    isDeleting: false,
  });
  
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
      expiryOption: '7days' | 'permanent';
      generatedLink: string;
      shortCode: string;
      isLoading: boolean;
      error: string;
      copySuccess: boolean;
  }>({
      isOpen: false,
      video: null,
      step: 'config',
      isHistorical: false,
      justification: '',
      allowDownload: false,
      hasPassword: false,
      password: '',
      expiryOption: '7days',
      generatedLink: '',
      shortCode: '',
      isLoading: false,
      error: '',
      copySuccess: false
  });

  // 已移除：链接查看功能已移至分享模块，不再需要这些状态和加载逻辑
  
  // Helper function to get matched tags for a video
  const getMatchedTagsForVideo = (video: Video): string[] => {
    const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
      ? selectedGroupTags 
      : selectedGroupTag 
        ? [selectedGroupTag] 
        : [];
    
    if (tagsToFilter.length === 0) return [];
    
    const matchedTags: string[] = [];
    
    tagsToFilter.forEach((tagName: string) => {
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
      // Showcase: 仅显示已添加到浏览区的案例文件（filteredShowcaseVideos），否则显示全部案例文件
      // 注意：检索面板的搜索和筛选不影响主浏览区，只有点击"全部添加"后才显示
      const caseFiles = videos.filter(v => v.isCaseFile);
      if (state.filteredShowcaseVideos.length > 0) {
          displayVideos = caseFiles.filter(v => state.filteredShowcaseVideos.includes(v.id));
      } else {
          displayVideos = caseFiles;
      }
      // 移除对 searchTerm 的过滤，确保检索面板的搜索不影响主浏览区
  } else if (selectedProjectId) {
      // Review/Delivery: Show videos for specific project
      displayVideos = videos.filter(v => v.projectId === selectedProjectId);
  } else if (activeModule === 'review') {
      // 审阅模块且未选中项目时，显示近期活跃视频（按最后活动时间排序，取前 12）
      const recent = [...videos]
        .filter(v => !!v.lastOpenedAt || !!v.uploadTime || !!v.createdAt)
        .sort((a, b) => {
          const aTime = new Date(a.lastOpenedAt || a.uploadTime || a.createdAt || 0).getTime();
          const bTime = new Date(b.lastOpenedAt || b.uploadTime || b.createdAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 12);
      displayVideos = recent;
  }

  // Margin Calculation
  // 【检索模式/文件模式】根据检索面板可见性调整左侧边距
  // - 检索模式（isRetrievalPanelVisible = true）：左侧边距 384px（侧边栏64px + 检索面板320px）
  // - 文件模式（isRetrievalPanelVisible = false）：左侧边距 64px（仅侧边栏）
  const leftMargin = isRetrievalPanelVisible ? 'ml-[384px]' : 'ml-[64px]';
  // 右侧边距：
  // - 检索模式：当操作台可见时应用右侧边距（操作台以侧边栏形式显示）
  // - 文件模式：操作台以模态覆盖形式显示，不挤压主浏览区，因此不应用右侧边距
  const isFileMode = !isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase');
  const rightMargin = (showWorkbench && !isFileMode) ? 'mr-[390px]' : 'mr-4';
  const marginClass = `${leftMargin} pt-14 pb-10 transition-all duration-300 ease-in-out ${rightMargin}`;
  
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
    // 检索模式下的 header（审阅模块）- 只显示项目信息，不显示上传按钮
    if (isRetrievalPanelVisible && activeModule === 'review' && project) {
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
    }
    
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

  // Group videos by "Series" (prefer后端的 baseName，fallback 去掉前缀的文件名)
  const groupVideosBySeries = (videos: Video[]) => {
      const groups: Record<string, Video[]> = {};

      const getBaseName = (v: Video) => {
          // 优先使用 baseName（资产名称），如果没有则从文件名中提取
          if (v.baseName) {
              return v.baseName;
          }
          // 如果没有 baseName，从文件名中去除版本前缀
          return v.name.replace(/^v\d+_/, '');
      };

      videos.forEach((video) => {
          const baseName = getBaseName(video);
          if (!groups[baseName]) {
              groups[baseName] = [];
          }
          groups[baseName].push(video);
      });
      
      // Sort versions within groups (Descending: v2 -> v1)
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
          password: '',
          expiryOption: '7days',
          generatedLink: '',
          shortCode: '',
          isLoading: false,
          error: '',
          copySuccess: false,
      });
  };

  // 处理上传新版本
  const handleUploadNewVersion = (video: Video) => {
      // 为某个视频上传新版本：先选中项目，再选中视频，最后打开操作台
      dispatch({ type: 'SELECT_PROJECT', payload: video.projectId });
      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
      dispatch({ 
        type: 'OPEN_WORKBENCH_VIEW', 
        payload: { view: 'upload', context: { projectId: video.projectId, videoId: video.id, from: 'video-card' } } 
      });
  };

  // 处理删除视频 - 显示确认弹窗
  const handleDeleteVideo = (video: Video) => {
      // 检查权限：普通用户只能删除自己上传的视频
      const isAdmin = user?.role === 'admin' || user?.role === 'DEV_SUPER_ADMIN';
      const isOwner = video.uploaderId === user?.id;
      
      if (!isAdmin && !isOwner) {
          toastManager.error('只能删除自己上传的视频');
          return;
      }
      
      // 打开确认弹窗
      setDeleteConfirmState({
          isOpen: true,
          video,
          isDeleting: false,
      });
  };
  
  // 确认删除视频的所有版本
  const handleConfirmDelete = async () => {
      const video = deleteConfirmState.video;
      if (!video) return;
      
      setDeleteConfirmState(prev => ({ ...prev, isDeleting: true }));
      
      try {
          const { videosApi } = await import('../../api/videos');
          // 删除该视频的所有版本
          await videosApi.delete(video.id, true);
          
          // 从state中移除该视频的所有版本
          const updatedVideos = videos.filter(v => 
              !(v.projectId === video.projectId && v.baseName === video.baseName)
          );
          dispatch({
              type: 'SET_VIDEOS',
              payload: updatedVideos
          });
          
          // 如果删除的视频包含当前选中的视频，清除选中状态
          const deletedVideoIds = videos
              .filter(v => v.projectId === video.projectId && v.baseName === video.baseName)
              .map(v => v.id);
          if (selectedVideoId && deletedVideoIds.includes(selectedVideoId)) {
              dispatch({ type: 'SELECT_VIDEO', payload: null });
          }
          
          // 关闭弹窗
          setDeleteConfirmState({
              isOpen: false,
              video: null,
              isDeleting: false,
          });
          
          // 发送成功通知
          toastManager.success(`视频 "${video.baseName || video.name}" 的所有版本已删除`);
      } catch (error: any) {
          console.error('删除视频失败:', error);
          const errorMessage = error?.response?.data?.message || error?.message || '删除失败，请重试';
          toastManager.error(errorMessage);
          
          setDeleteConfirmState(prev => ({ ...prev, isDeleting: false }));
      }
  };

  // 案例模块：添加到购物车并打开操作台
  const handleAddToCartAndOpenWorkbench = (videoId: string) => {
    // 如果视频不在购物车中，添加它
    if (!cart.includes(videoId)) {
      dispatch({ type: 'TOGGLE_CART_ITEM', payload: videoId });
    }
    // 打开操作台
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  const handleGenerateLink = async () => {
      if (!shareState.video) return;
      
      // 使用视频自己的 projectId，而不是全局选中的项目
      const videoProjectId = shareState.video.projectId;
      if (!videoProjectId) {
          setShareState(prev => ({ ...prev, error: '无法获取视频所属项目' }));
          return;
      }

      setShareState(prev => ({ ...prev, isLoading: true, error: '' }));

      try {
          // 根据选项计算过期时间
          let expiresAt: string | undefined;
          if (shareState.expiryOption === '7days') {
              const date = new Date();
              date.setDate(date.getDate() + 7);
              expiresAt = date.toISOString();
          }
          // 长期有效时不传 expiresAt
          
          const shareLink = await sharesApi.create({
              type: 'video_review',
              videoId: shareState.video.id,
              projectId: videoProjectId,
              allowDownload: shareState.allowDownload,
              hasPassword: shareState.hasPassword,
              password: shareState.hasPassword ? shareState.password : undefined,
              expiresAt,
              justification: shareState.isHistorical ? shareState.justification : undefined,
          });

          // 生成短链接格式 - 使用环境变量或默认域名
          const shareDomain = import.meta.env.VITE_SHARE_DOMAIN || window.location.origin;
          // 短链接格式：取 token 的前8位作为短码
          const shortCode = shareLink.token.substring(0, 8);
          const link = `${shareDomain}/s/${shortCode}`;
          
          setShareState(prev => ({ 
              ...prev, 
              step: 'success', 
              generatedLink: link,
              shortCode: shortCode,
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
                          <div className="space-y-5">
                              {/* 视频信息预览 */}
                              <div className={`flex items-center gap-3 p-3 ${theme.bg.primary} rounded-lg border ${theme.border.primary}`}>
                                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                                      <FileVideo className="w-6 h-6 text-indigo-400" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <div className="text-sm text-zinc-200 truncate font-medium">{shareState.video.name}</div>
                                      <div className="text-xs text-zinc-500 mt-0.5">v{shareState.video.version} • {shareState.video.size}</div>
                                  </div>
                              </div>

                              {/* 分享设置选项 */}
                              <div className="space-y-4">
                                  {/* 允许下载 */}
                                  <div className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-3 text-zinc-300">
                                          <Download className="w-4 h-4 text-zinc-500" />
                                          <span className="text-sm">允许下载源文件</span>
                                      </div>
                                      <button 
                                        onClick={() => setShareState(prev => ({ ...prev, allowDownload: !prev.allowDownload }))}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${shareState.allowDownload ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                                      >
                                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${shareState.allowDownload ? 'left-6' : 'left-1'}`} />
                                      </button>
                                  </div>
                                  
                                  {/* 密码保护 */}
                                  <div className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-3 text-zinc-300">
                                          <Lock className="w-4 h-4 text-zinc-500" />
                                          <span className="text-sm">密码保护</span>
                                      </div>
                                      <button 
                                        onClick={() => setShareState(prev => ({ ...prev, hasPassword: !prev.hasPassword, password: '' }))}
                                        className={`w-11 h-6 rounded-full transition-colors relative ${shareState.hasPassword ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                                      >
                                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${shareState.hasPassword ? 'left-6' : 'left-1'}`} />
                                      </button>
                                  </div>

                                  {/* 密码输入框 */}
                                  {shareState.hasPassword && (
                                      <div className="pl-7">
                                          <input 
                                              type="text"
                                              className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2.5 text-sm ${theme.text.secondary} focus:border-indigo-500 outline-none placeholder-zinc-600`}
                                              placeholder="设置访问密码"
                                              value={shareState.password}
                                              onChange={(e) => setShareState(prev => ({ ...prev, password: e.target.value }))}
                                          />
                                      </div>
                                  )}

                                  {/* 有效期选项 */}
                                  <div className="pt-2">
                                      <div className="flex items-center gap-3 text-zinc-300 mb-3">
                                          <Calendar className="w-4 h-4 text-zinc-500" />
                                          <span className="text-sm">链接有效期</span>
                                      </div>
                                      <div className="flex gap-2 pl-7">
                                          <button
                                            onClick={() => setShareState(prev => ({ ...prev, expiryOption: '7days' }))}
                                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                              shareState.expiryOption === '7days' 
                                                ? 'bg-indigo-600 text-white' 
                                                : `${theme.bg.primary} text-zinc-400 hover:text-zinc-200 border ${theme.border.primary}`
                                            }`}
                                          >
                                              <Clock className="w-4 h-4" />
                                              <span>7 天有效</span>
                                          </button>
                                          <button
                                            onClick={() => setShareState(prev => ({ ...prev, expiryOption: 'permanent' }))}
                                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                              shareState.expiryOption === 'permanent' 
                                                ? 'bg-indigo-600 text-white' 
                                                : `${theme.bg.primary} text-zinc-400 hover:text-zinc-200 border ${theme.border.primary}`
                                            }`}
                                          >
                                              <Infinity className="w-4 h-4" />
                                              <span>长期有效</span>
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              {shareState.error && (
                                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-400">
                                      {shareState.error}
                                  </div>
                              )}

                              {/* 生成链接按钮 */}
                              <div className="pt-2">
                                  <button 
                                    onClick={handleGenerateLink}
                                    disabled={shareState.isLoading || (shareState.hasPassword && !shareState.password.trim())}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3 rounded-lg text-sm font-medium shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                  >
                                      <Link2 className="w-4 h-4" />
                                      {shareState.isLoading ? '生成中...' : '生成分享链接'}
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* STEP 3: SUCCESS */}
                      {shareState.step === 'success' && (
                          <div className="space-y-5 py-2">
                              {/* 成功图标和标题 */}
                              <div className="text-center">
                                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <CheckCircle2 className="w-7 h-7" />
                                  </div>
                                  <h4 className="text-lg font-semibold text-zinc-100">分享链接已生成</h4>
                                  <p className="text-sm text-zinc-500 mt-1">
                                      {shareState.expiryOption === 'permanent' ? '此链接长期有效' : '此链接有效期为 7 天'}
                                  </p>
                              </div>

                              {/* 分享链接卡片 */}
                              <div className={`${theme.bg.primary} rounded-lg border ${shareState.copySuccess ? 'border-emerald-500/50' : theme.border.primary} p-4 transition-colors`}>
                                  <div className="flex items-center gap-3 mb-3">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                          <Link2 className="w-4 h-4 text-indigo-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-xs text-zinc-500 mb-0.5">分享链接</p>
                                          <p className="text-sm text-zinc-200 font-mono truncate">{shareState.generatedLink}</p>
                                      </div>
                                  </div>
                                  
                                  <button 
                                    onClick={async () => {
                                      try {
                                        // 优先使用 Clipboard API
                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                          await navigator.clipboard.writeText(shareState.generatedLink);
                                        } else {
                                          // 回退方案：使用传统的复制方法
                                          const textArea = document.createElement('textarea');
                                          textArea.value = shareState.generatedLink;
                                          textArea.style.position = 'fixed';
                                          textArea.style.left = '-9999px';
                                          textArea.style.top = '-9999px';
                                          document.body.appendChild(textArea);
                                          textArea.focus();
                                          textArea.select();
                                          document.execCommand('copy');
                                          document.body.removeChild(textArea);
                                        }
                                        setShareState(prev => ({ ...prev, copySuccess: true }));
                                        // 2秒后重置复制状态
                                        setTimeout(() => {
                                          setShareState(prev => ({ ...prev, copySuccess: false }));
                                        }, 2000);
                                      } catch (err) {
                                        console.error('复制失败:', err);
                                        // 即使失败也尝试使用回退方法
                                        try {
                                          const textArea = document.createElement('textarea');
                                          textArea.value = shareState.generatedLink;
                                          textArea.style.position = 'fixed';
                                          textArea.style.left = '-9999px';
                                          document.body.appendChild(textArea);
                                          textArea.focus();
                                          textArea.select();
                                          document.execCommand('copy');
                                          document.body.removeChild(textArea);
                                          setShareState(prev => ({ ...prev, copySuccess: true }));
                                          setTimeout(() => {
                                            setShareState(prev => ({ ...prev, copySuccess: false }));
                                          }, 2000);
                                        } catch (fallbackErr) {
                                          console.error('回退复制也失败:', fallbackErr);
                                          alert('复制失败，请手动复制链接');
                                        }
                                      }
                                    }}
                                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                      shareState.copySuccess 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                    }`}
                                  >
                                      {shareState.copySuccess ? (
                                        <>
                                          <Check className="w-4 h-4" />
                                          <span>链接已复制</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-4 h-4" />
                                          <span>复制链接</span>
                                        </>
                                      )}
                                  </button>
                              </div>

                              {/* 密码信息 */}
                              {shareState.hasPassword && shareState.password && (
                                  <div className={`${theme.bg.primary} rounded-lg border ${theme.border.primary} p-4`}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                              <Lock className="w-4 h-4 text-amber-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <p className="text-xs text-zinc-500 mb-0.5">访问密码</p>
                                              <p className="text-sm text-zinc-200 font-mono">{shareState.password}</p>
                                          </div>
                                          <button
                                            onClick={async () => {
                                              try {
                                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                                  await navigator.clipboard.writeText(shareState.password);
                                                } else {
                                                  const textArea = document.createElement('textarea');
                                                  textArea.value = shareState.password;
                                                  textArea.style.position = 'fixed';
                                                  textArea.style.left = '-9999px';
                                                  document.body.appendChild(textArea);
                                                  textArea.focus();
                                                  textArea.select();
                                                  document.execCommand('copy');
                                                  document.body.removeChild(textArea);
                                                }
                                                alert('密码已复制');
                                              } catch (err) {
                                                console.error('复制密码失败:', err);
                                              }
                                            }}
                                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                                            title="复制密码"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              )}

                              {/* 分享信息摘要 */}
                              <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                                  {shareState.allowDownload && (
                                      <span className="flex items-center gap-1">
                                          <Download className="w-3 h-3" />
                                          允许下载
                                      </span>
                                  )}
                                  {shareState.hasPassword && (
                                      <span className="flex items-center gap-1">
                                          <Lock className="w-3 h-3" />
                                          密码保护
                                      </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                      {shareState.expiryOption === 'permanent' ? (
                                          <>
                                              <Infinity className="w-3 h-3" />
                                              长期有效
                                          </>
                                      ) : (
                                          <>
                                              <Clock className="w-3 h-3" />
                                              7天有效
                                          </>
                                      )}
                                  </span>
                              </div>

                              {/* 关闭按钮 */}
                              <div className="text-center pt-2">
                                  <button 
                                    onClick={() => setShareState(prev => ({ ...prev, isOpen: false, copySuccess: false, expiryOption: '7days' }))}
                                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                                  >
                                      关闭窗口
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  /**
   * 【文件模式】资源管理器视图：Mac Finder 风格的网格卡片视图
   * 
   * 当检索面板隐藏时（isRetrievalPanelVisible = false），主浏览区切换到此视图
   * 按组/项目层级展示所有内容，类似文件资源管理器
   */
  const renderFileExplorerView = () => {
    const moduleProjects = getModuleProjects();
    const filteredProjects = searchTerm 
      ? moduleProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : moduleProjects;
    const groupedProjects = groupProjectsByGroup(filteredProjects);
    const groupNames = Object.keys(groupedProjects).sort();
    
    // 获取组内项目的预览图URL列表（最多4个）
    const getGroupProjectPreviews = (projectIds: string[]): string[] => {
      const previews: string[] = [];
      for (const projectId of projectIds) {
        if (previews.length >= 4) break;
        const projectVideos = videos.filter(v => v.projectId === projectId);
        if (projectVideos.length > 0) {
          const firstVideo = projectVideos[0];
          const url = firstVideo.thumbnailUrl || `https://picsum.photos/seed/${firstVideo.id}/400/225`;
          previews.push(url);
        }
      }
      return previews;
    };
    
    // 获取项目预览图的辅助函数
    const getProjectPreviewUrl = (projectId: string): string | null => {
      const projectVideos = videos.filter(v => v.projectId === projectId);
      if (projectVideos.length > 0) {
        const firstVideo = projectVideos[0];
        return firstVideo.thumbnailUrl || `https://picsum.photos/seed/${firstVideo.id}/400/225`;
      }
      return null;
    };
    
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
            <p className="mb-4">该项目暂无视频。</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                  dispatch({ 
                    type: 'OPEN_WORKBENCH_VIEW', 
                    payload: { view: 'upload', context: { projectId: selectedProjectId, from: 'project-empty' } } 
                  });
                }}
                className="p-2 rounded bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-500/50 hover:border-indigo-500/70 transition-all text-indigo-300 hover:text-indigo-200 shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30"
                title="上传视频"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={navigateBack}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        );
      }
      
      // 显示视频（支持网格/列表视图）
      if (browserViewMode === 'list') {
        // In list view, only show the latest version (First in the sorted array because we sorted descending)
        const latestVideos = seriesNames.map(name => {
          const versions = groups[name];
          return { video: versions[0], versionCount: versions.length, baseName: name }; 
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
              {/* 【项目目录】上传视频、审阅定版和项目设置按钮 - 仅审阅模块 */}
              {activeModule === 'review' && (
                <div className={`ml-auto flex items-center gap-2 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg px-2 py-1.5`}>
                  <button
                    onClick={() => {
                      // 【文件模式】在项目目录下，点击上传视频按钮，打开操作台上传视频
                      dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                      dispatch({ 
                        type: 'OPEN_WORKBENCH_VIEW', 
                        payload: { view: 'upload', context: { projectId: selectedProjectId, from: 'project-toolbar' } } 
                      });
                    }}
                    className="p-2 rounded transition-all text-indigo-400 hover:text-indigo-300"
                    title="上传视频"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  {/* 审阅定版按钮 - 只在项目有视频且状态为 active 时显示 */}
                  {latestVideos.length > 0 && selectedProject.status === 'active' && (
                    <button
                      onClick={() => {
                        dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                        dispatch({ 
                          type: 'OPEN_WORKBENCH_VIEW', 
                          payload: { view: 'finalizeReview', context: { projectId: selectedProjectId } } 
                        });
                      }}
                      className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-orange-400 transition-colors"
                      title="审阅定版"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {/* 项目设置按钮 */}
                  <button
                    onClick={() => {
                      dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                      dispatch({ 
                        type: 'OPEN_WORKBENCH_VIEW', 
                        payload: { view: 'projectSettings', context: { projectId: selectedProjectId, from: 'project-toolbar' } } 
                      });
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-400 transition-colors"
                    title="项目设置"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className={`flex flex-col ${gapClass}`}>
              {latestVideos.map(({ video, versionCount, baseName }) => (
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
                  isRetrievalMode={isRetrievalPanelVisible && activeModule === 'review'}
                  versionCount={versionCount}
                  onVersionClick={() => {
                    // 点击版本号，打开操作台显示历史版本
                    dispatch({ 
                      type: 'SHOW_VERSION_HISTORY', 
                      payload: { baseName, projectId: video.projectId, viewMode: 'list' } 
                    });
                  }}
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
                  onToggleCart={() => activeModule === 'showcase' ? handleAddToCartAndOpenWorkbench(video.id) : dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                  onShare={() => handleShareClick(video, true)}
                  onToggleSelection={activeModule === 'delivery' && selectedProject.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                  onUploadNewVersion={activeModule === 'review' ? () => handleUploadNewVersion(video) : undefined}
                  onDelete={activeModule === 'review' ? () => handleDeleteVideo(video) : undefined}
                  onRemove={activeModule === 'showcase' && state.filteredShowcaseVideos.length > 0 ? () => dispatch({ type: 'REMOVE_FROM_SHOWCASE_BROWSER', payload: video.id }) : undefined}
                />
              ))}
            </div>
          </div>
        );
      }
      
      // Grid Mode - 网格视图（与检索模式保持一致）
      const cardWidthClass = 
        browserCardSize === 'small' 
          ? 'min-w-[180px] max-w-[180px]' 
          : browserCardSize === 'medium' 
          ? 'min-w-[280px] max-w-[280px]' 
          : 'min-w-[420px] max-w-[420px]';
      
      return (
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              返回
            </button>
            {/* 【项目目录】上传视频、审阅定版和项目设置按钮 - 仅审阅模块 */}
            {activeModule === 'review' && (
              <div className={`ml-auto flex items-center gap-2 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg px-2 py-1.5`}>
                <button
                  onClick={() => {
                    // 【文件模式】在项目目录下，点击上传视频按钮，打开操作台上传视频
                    dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                    dispatch({ 
                      type: 'OPEN_WORKBENCH_VIEW', 
                      payload: { view: 'upload', context: { projectId: selectedProjectId, from: 'project-toolbar' } } 
                    });
                  }}
                  className="p-2 rounded transition-all text-indigo-400 hover:text-indigo-300"
                  title="上传视频"
                >
                  <Upload className="w-5 h-5" />
                </button>
                {/* 审阅定版按钮 - 只在项目有视频且状态为 active 时显示 */}
                {seriesNames.length > 0 && selectedProject.status === 'active' && (
                  <button
                    onClick={() => {
                      dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                      dispatch({ 
                        type: 'OPEN_WORKBENCH_VIEW', 
                        payload: { view: 'finalizeReview', context: { projectId: selectedProjectId } } 
                      });
                    }}
                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-orange-400 transition-colors"
                    title="审阅定版"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {/* 项目设置按钮 */}
                <button
                  onClick={() => {
                    dispatch({ type: 'SELECT_PROJECT', payload: selectedProjectId });
                    dispatch({ 
                      type: 'OPEN_WORKBENCH_VIEW', 
                      payload: { view: 'projectSettings', context: { projectId: selectedProjectId, from: 'project-toolbar' } } 
                    });
                  }}
                  className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="项目设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className={`grid ${
            browserCardSize === 'small' 
              ? 'gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
              : browserCardSize === 'medium' 
              ? 'gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
              : 'gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
            {seriesNames.map(name => {
              const versions = groups[name];
              const latestVideo = versions[0]; // First is latest due to Descending sort
              const hasMultipleVersions = versions.length > 1;

              return (
                <div key={name} className={`${cardWidthClass} min-w-0`}>
                  <VideoCard 
                    video={latestVideo} 
                    viewMode='grid'
                    cardSize={browserCardSize}
                    activeModule={activeModule}
                    isInCart={cart.includes(latestVideo.id)}
                    isLatest={true}
                    isDeliveryDelivered={activeModule === 'delivery' && selectedProject.status === 'delivered'}
                    isSelected={activeModule === 'delivery' && selectedProject.status === 'delivered' ? selectedDeliveryFiles.includes(latestVideo.id) : false}
                    matchedTags={getMatchedTagsForVideo(latestVideo)}
                    isRetrievalMode={isRetrievalPanelVisible && activeModule === 'review'}
                    versionCount={versions.length}
                    onVersionClick={() => {
                      // 点击版本号，打开操作台显示历史版本
                      dispatch({ 
                        type: 'SHOW_VERSION_HISTORY', 
                        payload: { baseName: name, projectId: latestVideo.projectId, viewMode: 'grid' } 
                      });
                    }}
                    onThumbnailClick={() => {
                      if (activeModule === 'delivery' || activeModule === 'showcase') {
                        setPreviewVideoId(latestVideo.id);
                      } else {
                        dispatch({ type: 'SELECT_VIDEO', payload: latestVideo.id });
                        dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                        // 视频会自动播放（在 ReviewOverlay 中实现）
                      }
                    }}
                    onBodyClick={() => {
                      if (activeModule !== 'review') {
                        dispatch({ type: 'SELECT_VIDEO', payload: latestVideo.id });
                      }
                    }}
                    onToggleCart={() => activeModule === 'showcase' ? handleAddToCartAndOpenWorkbench(latestVideo.id) : dispatch({ type: 'TOGGLE_CART_ITEM', payload: latestVideo.id })}
                    onShare={() => handleShareClick(latestVideo, true)}
                    onToggleSelection={activeModule === 'delivery' && selectedProject.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: latestVideo.id }) : undefined}
                    onUploadNewVersion={activeModule === 'review' ? () => handleUploadNewVersion(latestVideo) : undefined}
                    onDelete={activeModule === 'review' ? () => handleDeleteVideo(latestVideo) : undefined}
                    onRemove={activeModule === 'showcase' && state.filteredShowcaseVideos.length > 0 ? () => dispatch({ type: 'REMOVE_FROM_SHOWCASE_BROWSER', payload: latestVideo.id }) : undefined}
                  />
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
                      // 【文件模式】在文件模式下，直接打开操作台，不打开检索面板
                      // 设置待创建项目的组名为当前选中的组
                      dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: selectedGroupName });
                    dispatch({ 
                      type: 'OPEN_WORKBENCH_VIEW', 
                      payload: { view: 'newProject', context: { from: 'group-list', projectId: null } } 
                    });
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
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                              dispatch({ 
                                type: 'OPEN_WORKBENCH_VIEW', 
                                payload: { view: 'upload', context: { projectId: project.id, from: 'group-list' } } 
                              });
                            }}
                            className="p-2 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-indigo-400 hover:text-indigo-300"
                            title="上传视频"
                          >
                            <Upload className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                              dispatch({ 
                                type: 'OPEN_WORKBENCH_VIEW', 
                                payload: { view: 'projectSettings', context: { projectId: project.id, from: 'group-list' } } 
                              });
                            }}
                            className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-indigo-400 transition-colors"
                            title="项目设置"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </>
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
                              {/* 文件浏览器模式：显示资产名称 */}
                              <span className={`${textSizeClass} flex-1 ${isVideoSelected ? 'text-indigo-300' : theme.text.muted}`}>
                                {video.baseName || video.name}
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
              ? 'gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
              : 'gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
            {/* 新建项目按钮 - 仅审阅模块 */}
            {activeModule === 'review' && (
              <div
                onClick={() => {
                  // 【文件模式】在文件模式下，直接打开操作台，不打开检索面板
                  // 设置待创建项目的组名为当前选中的组
                  dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: selectedGroupName });
                  dispatch({ 
                    type: 'OPEN_WORKBENCH_VIEW', 
                    payload: { view: 'newProject', context: { from: 'group-grid-card' } } 
                  });
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
              const previewUrl = getProjectPreviewUrl(project.id);
              const previewHeightClass = browserCardSize === 'small' ? 'h-24 mb-2' : browserCardSize === 'medium' ? 'h-32 mb-2.5' : 'h-40 mb-3';
              const titleSizeClass = browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base';
              const metaSizeClass = browserCardSize === 'small' ? 'text-[10px]' : 'text-xs';
              return (
                <div
                  key={project.id}
                  onClick={() => handleItemClick(project.id, () => navigateToProject(project.id))}
                  className={`group relative ${paddingClass} ${theme.bg.secondary} border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col overflow-hidden`}
                >
                  {/* 项目图标 + 1个视频的预览图 */}
                  <div className={`w-full ${previewHeightClass} shrink-0 relative bg-zinc-800/30 rounded-lg overflow-hidden`}>
                    {/* 项目图标 - 左上角 */}
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <ProjectIcon 
                        size={browserCardSize === 'small' ? 16 : browserCardSize === 'medium' ? 18 : 20} 
                        className="text-indigo-400/90 drop-shadow-sm" 
                      />
                    </div>
                    {/* 项目设置按钮 - 右上角，仅在审阅模块显示 */}
                    {activeModule === 'review' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                          dispatch({ 
                            type: 'OPEN_WORKBENCH_VIEW', 
                            payload: { view: 'projectSettings', context: { projectId: project.id, from: 'group-grid-card' } } 
                          });
                        }}
                        className="absolute top-1.5 right-1.5 z-10 p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded text-zinc-400 hover:text-indigo-400 transition-all opacity-0 group-hover:opacity-100"
                        title="项目设置"
                      >
                        <Settings className={`${browserCardSize === 'small' ? 'w-3 h-3' : browserCardSize === 'medium' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                      </button>
                    )}
                    {/* 视频预览图 */}
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt={project.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ProjectIcon 
                          size={browserCardSize === 'small' ? 24 : browserCardSize === 'medium' ? 32 : 40} 
                          className="text-indigo-500/50" 
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center text-center flex-1 min-h-0 mt-2">
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
                  // 【文件模式】在文件模式下，直接打开操作台，不打开检索面板
                  // 新建组在根目录下，不需要设置组名
                  dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: null });
                  dispatch({ 
                    type: 'OPEN_WORKBENCH_VIEW', 
                    payload: { view: 'newProject', context: { from: 'root-group' } } 
                  });
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
                        // 【文件模式】在文件模式下，直接打开操作台，不打开检索面板
                        // 设置待创建项目的组名为当前组
                        setSelectedGroupName(groupName);
                        dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: groupName });
                    dispatch({ 
                      type: 'OPEN_WORKBENCH_VIEW', 
                      payload: { view: 'newProject', context: { from: 'group-list-action', projectId: null } } 
                    });
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
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                                    dispatch({ 
                                      type: 'OPEN_WORKBENCH_VIEW', 
                                      payload: { view: 'upload', context: { projectId: project.id, from: 'group-list-project' } } 
                                    });
                                  }}
                                  className="p-2 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/50 transition-all text-indigo-400 hover:text-indigo-300"
                                  title="上传视频"
                                >
                                  <Upload className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                                    dispatch({ 
                                      type: 'OPEN_WORKBENCH_VIEW', 
                                      payload: { view: 'projectSettings', context: { projectId: project.id, from: 'group-list-project' } } 
                                    });
                                  }}
                                  className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-indigo-400 transition-colors"
                                  title="项目设置"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                              </>
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
                                    {/* 文件浏览器模式：显示资产名称 */}
                                    <span className={`${textSizeClass} flex-1 ${isVideoSelected ? 'text-indigo-300' : theme.text.muted}`}>
                                      {video.baseName || video.name}
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
          ? 'gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
          : 'gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
      }`}>
        {/* 新建组按钮 - 仅审阅模块 */}
        {activeModule === 'review' && (
          <div
            onClick={() => {
              // 【文件模式】在文件模式下，直接打开操作台，不打开检索面板
              // 新建组在根目录下，不需要设置组名
              dispatch({ type: 'SET_PENDING_PROJECT_GROUP', payload: null });
              dispatch({ 
                type: 'OPEN_WORKBENCH_VIEW', 
                payload: { view: 'newProject', context: { from: 'root-group-grid' } } 
              });
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
          const projectIds = groupProjects.map(p => p.id);
          const projectPreviews = getGroupProjectPreviews(projectIds);
          const paddingClass = browserCardSize === 'small' ? 'p-2' : browserCardSize === 'medium' ? 'p-3' : 'p-4';
          const previewHeightClass = browserCardSize === 'small' ? 'h-24 mb-2' : browserCardSize === 'medium' ? 'h-32 mb-2.5' : 'h-40 mb-3';
          const titleSizeClass = browserCardSize === 'small' ? 'text-xs' : browserCardSize === 'medium' ? 'text-sm' : 'text-base';
          const metaSizeClass = browserCardSize === 'small' ? 'text-[10px]' : 'text-xs';
          
          return (
            <div
              key={groupName}
              onClick={() => handleItemClick(`group_${groupName}`, () => navigateToGroup(groupName))}
              className={`group relative ${paddingClass} ${theme.bg.secondary} border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : theme.border.primary} rounded-lg cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-800/50 transition-all flex flex-col overflow-hidden`}
            >
              {/* 组图标 + 4个项目的预览图（2x2网格） */}
              <div className={`w-full ${previewHeightClass} shrink-0 relative bg-zinc-800/30 rounded-lg overflow-hidden`}>
                {/* 组图标 - 左上角 */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <GroupIcon 
                    size={browserCardSize === 'small' ? 16 : browserCardSize === 'medium' ? 18 : 20} 
                    className="text-indigo-400/90 drop-shadow-sm" 
                  />
                </div>
                {/* 4个项目的预览图 - 2x2网格 */}
                {projectPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-0.5 h-full p-0.5">
                    {[...Array(4)].map((_, index) => {
                      const previewUrl = projectPreviews[index];
                      return (
                        <div key={index} className="relative bg-zinc-800 overflow-hidden">
                          {previewUrl ? (
                            <img 
                              src={previewUrl} 
                              alt={`${groupName} 项目 ${index + 1}`}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800/50 flex items-center justify-center">
                              <div className="w-3 h-3 border border-zinc-600 rounded" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <GroupIcon 
                      size={browserCardSize === 'small' ? 24 : browserCardSize === 'medium' ? 32 : 40} 
                      className="text-indigo-500/50" 
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center text-center flex-1 min-h-0 mt-2">
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
            </div>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
      // 【文件模式】如果检索面板隐藏，显示资源管理器视图（按组显示项目）
      // 在审阅、交付、案例模块下，当 isRetrievalPanelVisible = false 时，切换到文件模式
      if (!isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase')) {
          return renderFileExplorerView();
      }

      const groups = groupVideosBySeries(displayVideos);
      const seriesNames = Object.keys(groups).sort();

      if (seriesNames.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                  <Film className="w-12 h-12 mb-4 opacity-20" />
                  <p className="mb-4">该项目暂无视频。</p>
                  {activeModule === 'review' && project && (
                      <button
                          onClick={() => {
                              dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                              dispatch({ 
                                type: 'OPEN_WORKBENCH_VIEW', 
                                payload: { view: 'upload', context: { projectId: project.id, from: 'project-empty' } } 
                              });
                          }}
                          className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-indigo-400"
                          title="上传视频"
                      >
                          <Upload className="w-4 h-4" />
                      </button>
                  )}
              </div>
          );
      }

      if (browserViewMode === 'list') {
          // In list view, only show the latest version (First in the sorted array because we sorted descending)
          const latestVideos = seriesNames.map(name => {
              const versions = groups[name];
              return { video: versions[0], versionCount: versions.length, baseName: name }; 
          });

          // List Gap
          const gapClass = browserCardSize === 'small' ? 'gap-0.5' : browserCardSize === 'medium' ? 'gap-2' : 'gap-4';

          return (
              <div>
                  {/* 检索模式下上传视频按钮工具栏 - 仅审阅模块 */}
                  {isRetrievalPanelVisible && activeModule === 'review' && project && (
                      <div className="flex items-center justify-end gap-3 mb-4">
                          <button
                              onClick={() => {
                                  dispatch({ 
                                    type: 'OPEN_WORKBENCH_VIEW', 
                                    payload: { view: 'upload', context: { projectId: project?.id || null, from: 'retrieval-toolbar' } } 
                                  });
                              }}
                              className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-indigo-400"
                              title="上传视频"
                          >
                              <Upload className="w-4 h-4" />
                          </button>
                      </div>
                  )}
                  <div className={`flex flex-col ${gapClass}`}>
                      {latestVideos.map(({ video, versionCount, baseName }) => (
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
                          isRetrievalMode={isRetrievalPanelVisible && activeModule === 'review'}
                          versionCount={versionCount}
                          onVersionClick={() => {
                            // 点击版本号，打开操作台显示历史版本
                            dispatch({ 
                              type: 'SHOW_VERSION_HISTORY', 
                              payload: { baseName, projectId: video.projectId, viewMode: 'list' } 
                            });
                          }}
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
                          onToggleCart={() => activeModule === 'showcase' ? handleAddToCartAndOpenWorkbench(video.id) : dispatch({ type: 'TOGGLE_CART_ITEM', payload: video.id })}
                          onShare={() => handleShareClick(video, true)}
                          onToggleSelection={activeModule === 'delivery' && project && project.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: video.id }) : undefined}
                          onUploadNewVersion={activeModule === 'review' ? () => handleUploadNewVersion(video) : undefined}
                          onDelete={activeModule === 'review' ? () => handleDeleteVideo(video) : undefined}
                          onRemove={activeModule === 'showcase' && state.filteredShowcaseVideos.length > 0 ? () => dispatch({ type: 'REMOVE_FROM_SHOWCASE_BROWSER', payload: video.id }) : undefined}
                      />
                  ))}
                  </div>
              </div>
          );
      }

      // Grid Mode
      return (
          <div>
              {/* 检索模式下上传视频按钮工具栏 - 仅审阅模块 */}
              {isRetrievalPanelVisible && activeModule === 'review' && project && (
                  <div className="flex items-center justify-end gap-3 mb-4">
                      <button
                          onClick={() => {
                              dispatch({ 
                                type: 'OPEN_WORKBENCH_VIEW', 
                                payload: { view: 'upload', context: { projectId: project?.id || null, from: 'retrieval-toolbar-grid' } } 
                              });
                          }}
                          className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-indigo-400"
                          title="上传视频"
                      >
                          <Upload className="w-4 h-4" />
                      </button>
                  </div>
              )}
              <div className={`grid ${
            browserCardSize === 'small' 
              ? 'gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' 
              : browserCardSize === 'medium' 
              ? 'gap-2 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
              : 'gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          }`}>
              {seriesNames.map(name => {
                  const versions = groups[name];
                  const latestVideo = versions[0]; // First is latest due to Descending sort
                  const hasMultipleVersions = versions.length > 1;

                  return (
                    <div key={name} className="w-full min-w-0">
                        <VideoCard 
                            video={latestVideo} 
                            viewMode='grid'
                            cardSize={browserCardSize}
                            activeModule={activeModule}
                            isInCart={cart.includes(latestVideo.id)}
                            isLatest={true}
                            isDeliveryDelivered={activeModule === 'delivery' && !!project && project.status === 'delivered'}
                            isSelected={activeModule === 'delivery' && project && project.status === 'delivered' ? selectedDeliveryFiles.includes(latestVideo.id) : false}
                            matchedTags={getMatchedTagsForVideo(latestVideo)}
                            isRetrievalMode={isRetrievalPanelVisible && activeModule === 'review'}
                            versionCount={versions.length}
                            onVersionClick={() => {
                              // 点击版本号，打开操作台显示历史版本
                              dispatch({ 
                                type: 'SHOW_VERSION_HISTORY', 
                                payload: { baseName: name, projectId: latestVideo.projectId, viewMode: 'grid' } 
                              });
                            }}
                            onThumbnailClick={() => {
                              if (activeModule === 'delivery' || activeModule === 'showcase') {
                                setPreviewVideoId(latestVideo.id);
                              } else {
                                dispatch({ type: 'SELECT_VIDEO', payload: latestVideo.id });
                                dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
                                // 视频会自动播放（在 ReviewOverlay 中实现）
                              }
                            }}
                            onBodyClick={() => {
                              if (activeModule !== 'review') {
                                dispatch({ type: 'SELECT_VIDEO', payload: latestVideo.id });
                              }
                            }}
                            onToggleCart={() => activeModule === 'showcase' ? handleAddToCartAndOpenWorkbench(latestVideo.id) : dispatch({ type: 'TOGGLE_CART_ITEM', payload: latestVideo.id })}
                            onShare={() => handleShareClick(latestVideo, true)}
                            onToggleSelection={activeModule === 'delivery' && project && project.status === 'delivered' ? () => dispatch({ type: 'TOGGLE_DELIVERY_FILE_SELECTION', payload: latestVideo.id }) : undefined}
                            onUploadNewVersion={activeModule === 'review' && isRetrievalPanelVisible ? () => handleUploadNewVersion(latestVideo) : undefined}
                            onDelete={activeModule === 'review' && isRetrievalPanelVisible ? () => handleDeleteVideo(latestVideo) : undefined}
                            onRemove={activeModule === 'showcase' && state.filteredShowcaseVideos.length > 0 ? () => dispatch({ type: 'REMOVE_FROM_SHOWCASE_BROWSER', payload: latestVideo.id }) : undefined}
                        />
                    </div>
                  );
              })}
              </div>
          </div>
      );
  };

  return (
    <main className={marginClass}>
      <div className="sticky top-14 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 h-20 mb-6 flex items-center min-w-0 gap-4">
        {/* 展开按钮 - 当面板隐藏时显示，位于标题左侧 */}
        {!isRetrievalPanelVisible && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase') && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_RETRIEVAL_PANEL' })}
            className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${theme.text.muted} hover:text-zinc-200 flex-shrink-0`}
            title="显示面板"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0 flex-shrink flex-1 overflow-hidden">
          {renderHeader()}
        </div>
        
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 flex-1 justify-end overflow-hidden">
             {project && activeModule === 'review' && (
                <div className="text-xs text-zinc-500 mr-2 whitespace-nowrap">
                    <span className="text-zinc-300">{displayVideos.length}</span> 个视频文件
                </div>
            )}


            {/* View Toggles */}
            <div className={`flex items-center gap-1 rounded-lg p-1 ${theme.bg.secondary} border ${theme.border.primary}`}>
                <button 
                    onClick={() => dispatch({ type: 'SET_BROWSER_VIEW_MODE', payload: 'grid' })}
                    className={`px-2 py-1.5 rounded-md transition-all flex items-center gap-0 text-xs font-medium ${
                        browserViewMode === 'grid' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="卡片视图"
                >
                    <LayoutGrid className={`w-4 h-4 ${browserViewMode === 'grid' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
                </button>
                <button 
                    onClick={() => dispatch({ type: 'SET_BROWSER_VIEW_MODE', payload: 'list' })}
                    className={`px-2 py-1.5 rounded-md transition-all flex items-center gap-0 text-xs font-medium ${
                        browserViewMode === 'list' 
                            ? `${theme.text.indigo} bg-indigo-500/20` 
                            : `${theme.text.disabled} ${theme.text.hover}`
                    }`}
                    title="列表视图"
                >
                    <List className={`w-4 h-4 ${browserViewMode === 'list' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
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

            {/* 模式标签 - 显示当前工作模式，可点击切换 */}
            {(activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase') && (
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_RETRIEVAL_PANEL' })}
                    className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer leading-tight text-center"
                    title={isRetrievalPanelVisible ? '点击切换到文件模式' : '点击切换到检索模式'}
                >
                    {isRetrievalPanelVisible ? (
                        <span className="block">检索<br />模式</span>
                    ) : (
                        <span className="block">文件<br />模式</span>
                    )}
                </button>
            )}
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
      
      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, video: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="确认删除视频"
        confirmText="删除所有版本"
        cancelText="取消"
        variant="danger"
        loading={deleteConfirmState.isDeleting}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className={`text-sm ${theme.text.secondary} leading-relaxed mb-3`}>
                确定要删除视频 <span className="text-zinc-200 font-medium">"{deleteConfirmState.video?.baseName || deleteConfirmState.video?.name}"</span> 的所有版本吗？
              </p>
              <p className={`text-sm ${theme.text.muted} leading-relaxed`}>
                此操作将删除该视频的所有版本，删除后可在回收站中恢复。
              </p>
              {!user || (user.role !== 'admin' && user.role !== 'DEV_SUPER_ADMIN') ? (
                <p className={`text-xs ${theme.text.muted} mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded`}>
                  提示：普通用户只能删除自己上传的视频
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </ConfirmModal>
    </main>
  );

  // 已移除：renderReviewShareLinks - 链接查看功能已移至分享模块
  // 函数已完全删除，不再保留注释代码

  // 已移除：renderDeliveryPackages - 链接查看功能已移至分享模块
  // 函数已完全删除，不再保留注释代码

  // 已移除：renderShowcasePackages - 链接查看功能已移至分享模块
  // 函数已完全删除，不再保留注释代码
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
    matchedTags?: string[]; // 匹配的标签
    isRetrievalMode?: boolean; // 是否在检索模式下
    versionCount?: number; // 版本数量（如果有多个版本）
    onVersionClick?: () => void; // 点击版本号时的回调
    onThumbnailClick: () => void;
    onBodyClick: () => void;
    onToggleCart: () => void;
    onShare: () => void;
    onToggleSelection?: () => void; // 交付模块选择切换
    onUploadNewVersion?: () => void; // 上传新版本
    onDelete?: () => void; // 删除视频
    onRemove?: () => void; // 案例模块从浏览区移除
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
    isRetrievalMode = false,
    versionCount,
    onVersionClick,
    onThumbnailClick,
    onBodyClick,
    onToggleCart,
    onShare,
    onToggleSelection,
    onUploadNewVersion,
    onDelete,
    onRemove
}) => {
  const { dispatch } = useStore();
  const { currentTeam } = useTeam();
  const [isEditingAssetName, setIsEditingAssetName] = useState(false);
  const [editingAssetName, setEditingAssetName] = useState('');
  const [isSavingAssetName, setIsSavingAssetName] = useState(false);
  
  const handleStartEditAssetName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAssetName(video.baseName || video.name.replace(/^v\d+_/, ''));
    setIsEditingAssetName(true);
  };
  
  const handleCancelEditAssetName = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditingAssetName(false);
    setEditingAssetName('');
  };
  
  const handleSaveAssetName = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const newAssetName = editingAssetName.trim();
    
    if (!newAssetName) {
      toastManager.warning('资产名称不能为空');
      return;
    }
    
    // 如果名称没有变化，直接取消编辑
    const currentAssetName = video.baseName || video.name.replace(/^v\d+_/, '');
    if (newAssetName === currentAssetName) {
      handleCancelEditAssetName();
      return;
    }
    
    // 检查团队内唯一性
    if (currentTeam?.id) {
      try {
        const { videosApi } = await import('../../api/videos');
        const result = await videosApi.checkAssetNameUnique(newAssetName, currentTeam.id);
        if (!result.unique) {
          toastManager.warning(`资产名称 "${newAssetName}" 已存在，请使用其他名称`);
          return;
        }
      } catch (error) {
        console.error('检查资产名称唯一性失败:', error);
        // 继续保存，让后端验证
      }
    }
    
    setIsSavingAssetName(true);
    try {
      const { videosApi } = await import('../../api/videos');
      const updatedVideo = await videosApi.update(video.id, {
        baseName: newAssetName
      });
      
      // 更新本地状态
      dispatch({
        type: 'UPDATE_VIDEO',
        payload: updatedVideo
      });
      
      toastManager.success('资产名称已更新');
      setIsEditingAssetName(false);
      setEditingAssetName('');
    } catch (error: any) {
      console.error('更新资产名称失败:', error);
      const errorMsg = error?.response?.data?.message || error.message || '更新失败';
      toastManager.error(`更新资产名称失败: ${errorMsg}`);
    } finally {
      setIsSavingAssetName(false);
    }
  };
  
  const handleAssetNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveAssetName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditAssetName();
    }
  };
  
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
                    {/* 主浏览区显示资产名称（baseName），如果没有则显示文件名 */}
                    <div className="flex items-center gap-2 min-w-0">
                      {isEditingAssetName ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingAssetName}
                            onChange={(e) => setEditingAssetName(e.target.value)}
                            onKeyDown={handleAssetNameKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 bg-zinc-800 border border-indigo-500 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveAssetName}
                            disabled={isSavingAssetName}
                            className="p-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                            title="保存"
                          >
                            {isSavingAssetName ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEditAssetName}
                            disabled={isSavingAssetName}
                            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                            title="取消"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className={`${fontSize} font-medium text-zinc-200 truncate flex-1 min-w-0`} title={video.baseName || video.name}>
                            {video.baseName || video.name}
                          </h3>
                          {/* 仅在审阅模块且视频有 baseName 时显示编辑按钮 */}
                          {activeModule === 'review' && video.baseName && (
                            <button
                              onClick={handleStartEditAssetName}
                              className="p-1 text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="编辑资产名称"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
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
                            {matchedTags.map((tagName: string) => (
                              <span 
                                key={tagName}
                                className="px-1.5 py-0.5 rounded text-[9px] text-indigo-400"
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
                    <>
                        {/* 审阅模块下，在分享按钮左侧添加上传和删除按钮（检索模式和文件模式都显示） */}
                        {activeModule === 'review' && onUploadNewVersion && onDelete && (
                            <>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUploadNewVersion(); }}
                                    className="p-1.5 rounded transition-colors text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                                    title="上传新版本"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="p-1.5 rounded transition-colors text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                    title="删除视频"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onShare(); }}
                            className={`p-1.5 rounded transition-colors ${isLatest ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'}`}
                            title={isLatest ? "对外分享" : "分享历史版本"}
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        {/* 案例模块：移除按钮 */}
                        {activeModule === 'showcase' && onRemove && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-1.5 rounded transition-colors text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                title="从浏览区移除"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleCart(); }}
                            className={`p-1.5 rounded transition-colors ${isInCart ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            {isInCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                    </>
                )}
             </div>
        </div>
      );
  }

  // GRID VIEW
  // 使用 container queries 实现等比例缩放

  return (
    <div 
      onClick={onBodyClick}
      style={{ containerType: 'inline-size' }}
      className={`group relative bg-zinc-900 border rounded-lg overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/50 flex flex-col w-full min-w-0 aspect-[3/4]
        ${isInCart ? 'border-indigo-500 ring-1 ring-indigo-500/50' : ''}
        ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/50' : ''}
        ${!isInCart && !isSelected ? 'border-zinc-800 hover:border-zinc-600' : ''}
      `}
    >
      {/* Thumbnail - 保持 1:1 正方形比例 */}
      <div className={`relative w-full aspect-square bg-zinc-800 overflow-hidden shrink-0`}>
        <div onClick={(e) => { e.stopPropagation(); onThumbnailClick(); }} className="w-full h-full relative group/thumb">
             {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt="Thumbnail" 
                  className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full flex items-center justify-center bg-zinc-900 ${video.thumbnailUrl ? 'hidden' : 'flex'}`}
                style={{ display: video.thumbnailUrl ? 'none' : 'flex' }}
              >
                <div className="flex flex-col items-center gap-2 text-zinc-600">
                  <Play className="w-12 h-12" />
                  <span className="text-xs">生成中...</span>
                </div>
              </div>
            <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-black/40 transition-colors flex items-center justify-center">
                <div 
                    style={{ width: '15cqi', height: '15cqi', maxWidth: '40px', maxHeight: '40px', minWidth: '24px', minHeight: '24px' }}
                    className="rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 scale-75 group-hover/thumb:scale-100 transition-all duration-200 hover:bg-indigo-500 hover:text-white"
                >
                    <Play style={{ width: '40%', height: '40%' }} className="fill-current pl-0.5" />
                </div>
            </div>
        </div>

        {/* Badges - 左上角标签组 */}
        <div style={{ top: '4cqi', left: '4cqi', gap: '1.5cqi' }} className="absolute flex z-10">
            {/* 版本号 - 带颜色 */}
            {activeModule !== 'showcase' && (
                <span 
                    onClick={(e) => {
                        if (onVersionClick && versionCount) {
                            e.stopPropagation();
                            e.preventDefault();
                            onVersionClick();
                        }
                    }}
                    onMouseDown={(e) => {
                        // 阻止 mousedown 事件冒泡，避免触发卡片的点击
                        if (onVersionClick && versionCount) {
                            e.stopPropagation();
                        }
                    }}
                    style={{ fontSize: 'clamp(9px, 3.5cqi, 12px)', padding: 'clamp(2px, 1cqi, 4px) clamp(5px, 2cqi, 8px)' }}
                    className={`bg-indigo-600/80 backdrop-blur-md font-semibold rounded text-white whitespace-nowrap ${
                        onVersionClick && versionCount 
                            ? 'cursor-pointer hover:bg-indigo-500 transition-colors' 
                            : ''
                    }`}
                    title={versionCount ? `点击查看${versionCount > 1 ? ` ${versionCount} 个版本` : '历史版本'}` : undefined}
                >
                    v{video.version}{versionCount && versionCount > 1 ? ` (${versionCount})` : ''}
                </span>
            )}
            {/* 批注状态 */}
            {video.status === 'annotated' && (
              <span 
                style={{ fontSize: 'clamp(9px, 3.5cqi, 12px)', padding: 'clamp(2px, 1cqi, 4px) clamp(5px, 2cqi, 8px)' }}
                className="bg-amber-500/90 backdrop-blur-md font-semibold rounded text-white whitespace-nowrap"
              >
                {video.annotationCount && video.annotationCount > 0 ? `批注*${video.annotationCount}` : '已批注'}
              </span>
            )}
            {/* 已通过状态 */}
            {video.status === 'approved' && (
              <span 
                style={{ fontSize: 'clamp(9px, 3.5cqi, 12px)', padding: 'clamp(2px, 1cqi, 4px) clamp(5px, 2cqi, 8px)' }}
                className="bg-emerald-500/90 backdrop-blur-md font-semibold rounded text-white whitespace-nowrap"
              >
                已通过
              </span>
            )}
        </div>
        
        {/* Duration - 左下角时长 */}
        <div 
            style={{ bottom: '4cqi', left: '4cqi', fontSize: 'clamp(9px, 3.5cqi, 12px)', padding: 'clamp(2px, 1cqi, 4px) clamp(5px, 2cqi, 8px)' }}
            className="absolute bg-black/60 backdrop-blur-md font-mono rounded text-white/90 z-10 whitespace-nowrap"
        >
            {video.duration}
        </div>

        {/* Share Button - 右上角分享按钮（非案例模块）或移除按钮（案例模块） */}
        <div 
            style={{ top: '4cqi', right: '4cqi' }}
            className="absolute z-10" 
            onClick={e => e.stopPropagation()}
        >
            {activeModule !== 'showcase' ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                    className={`rounded transition-all duration-200 bg-black/60 backdrop-blur-md ${isLatest ? 'text-white/90 hover:bg-indigo-500 hover:text-white' : 'text-white/60 hover:bg-black/80 hover:text-white/90'}`}
                    title={isLatest ? "对外分享" : "分享历史版本"}
                >
                    <Share2 style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />
                </button>
            ) : activeModule === 'showcase' && onRemove ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                    className="rounded transition-all duration-200 bg-black/60 backdrop-blur-md text-white/90 hover:bg-red-500 hover:text-white"
                    title="从浏览区移除"
                >
                    <X style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />
                </button>
            ) : null}
        </div>

        {/* Action Buttons - 右下角操作按钮组 */}
        {((isDeliveryDelivered && onToggleSelection) || 
          (activeModule === 'review' && onUploadNewVersion && onDelete) || 
          activeModule === 'showcase') && (
            <div 
                style={{ bottom: '4cqi', right: '4cqi' }}
                className="absolute z-10" 
                onClick={e => e.stopPropagation()}
            >
                <div 
                    style={{ gap: 'clamp(2px, 1cqi, 4px)' }}
                    className="flex items-center"
                >
                    {isDeliveryDelivered && onToggleSelection ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                            style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                            className={`rounded transition-all duration-200 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-black/60 backdrop-blur-md text-white/90 hover:bg-emerald-500 hover:text-white'}`}
                        >
                            {isSelected ? <Check style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} /> : <Plus style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />}
                        </button>
                    ) : activeModule === 'review' && onUploadNewVersion && onDelete ? (
                        <>
                            {/* 上传新版本按钮 */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUploadNewVersion(); }}
                                style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                                className="rounded transition-all duration-200 bg-black/60 backdrop-blur-md text-white/90 hover:bg-indigo-500 hover:text-white"
                                title="上传新版本"
                            >
                                <Upload style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />
                            </button>
                            {/* 删除按钮 */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                                className="rounded transition-all duration-200 bg-black/60 backdrop-blur-md text-white/90 hover:bg-red-500 hover:text-white"
                                title="删除视频"
                            >
                                <Trash2 style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />
                            </button>
                        </>
                    ) : activeModule === 'showcase' ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleCart(); }}
                            style={{ padding: 'clamp(4px, 1.5cqi, 6px)' }}
                            className={`rounded transition-all duration-200 ${isInCart ? 'bg-indigo-500 text-white' : 'bg-black/60 backdrop-blur-md text-white/90 hover:bg-indigo-500 hover:text-white'}`}
                        >
                            {isInCart ? <Check style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} /> : <Plus style={{ width: 'clamp(12px, 4cqi, 16px)', height: 'clamp(12px, 4cqi, 16px)' }} />}
                        </button>
                    ) : null}
                </div>
            </div>
        )}
      </div>

      {/* Info Body - 使用 cqi 单位等比例缩放，填充剩余空间 */}
      <div 
        style={{ padding: 'clamp(6px, 3cqi, 12px)' }}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="mb-0.5">
            {/* 网格视图：显示资产名称 */}
            <div className="flex items-center gap-1.5 min-w-0">
              {isEditingAssetName ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="text"
                    value={editingAssetName}
                    onChange={(e) => setEditingAssetName(e.target.value)}
                    onKeyDown={handleAssetNameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 'clamp(11px, 6cqi, 18px)' }}
                    className="flex-1 min-w-0 bg-zinc-800 border border-indigo-500 rounded px-1.5 py-0.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveAssetName}
                    disabled={isSavingAssetName}
                    className="p-0.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 shrink-0"
                    title="保存"
                  >
                    {isSavingAssetName ? (
                      <Loader2 style={{ width: 'clamp(10px, 4cqi, 14px)', height: 'clamp(10px, 4cqi, 14px)' }} className="animate-spin" />
                    ) : (
                      <Save style={{ width: 'clamp(10px, 4cqi, 14px)', height: 'clamp(10px, 4cqi, 14px)' }} />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditAssetName}
                    disabled={isSavingAssetName}
                    className="p-0.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50 shrink-0"
                    title="取消"
                  >
                    <X style={{ width: 'clamp(10px, 4cqi, 14px)', height: 'clamp(10px, 4cqi, 14px)' }} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 
                      style={{ fontSize: 'clamp(11px, 6cqi, 18px)', lineHeight: '1.3' }}
                      className="font-medium text-zinc-200 line-clamp-1 group-hover:text-indigo-400 transition-colors flex-1 min-w-0" 
                      title={video.baseName || video.name}
                  >
                      {video.baseName || video.name}
                  </h3>
                  {/* 仅在审阅模块且视频有 baseName 时显示编辑按钮 */}
                  {activeModule === 'review' && video.baseName && (
                    <button
                      onClick={handleStartEditAssetName}
                      style={{ width: 'clamp(10px, 4cqi, 14px)', height: 'clamp(10px, 4cqi, 14px)' }}
                      className="text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="编辑资产名称"
                    >
                      <Edit2 className="w-full h-full" />
                    </button>
                  )}
                </>
              )}
            </div>
        </div>
        
        {/* 显示被命中的标签 */}
        {matchedTags.length > 0 && (
          <div style={{ gap: 'clamp(2px, 1cqi, 4px)', marginTop: 'clamp(2px, 1cqi, 4px)' }} className="flex items-center flex-wrap">
            {matchedTags.map(tagName => (
              <span 
                key={tagName}
                style={{ fontSize: 'clamp(8px, 3cqi, 11px)', padding: 'clamp(1px, 0.5cqi, 2px) clamp(3px, 1.5cqi, 6px)' }}
                className="rounded text-indigo-400"
              >
                {tagName}
              </span>
            ))}
          </div>
        )}

        {/* 上传日期 - 固定在底部 */}
        <div className="flex items-center text-zinc-500 mt-auto pt-1">
             <span 
                style={{ fontSize: 'clamp(9px, 4cqi, 12px)', gap: 'clamp(2px, 1cqi, 4px)' }} 
                className="flex items-center truncate opacity-70"
             >
                <Clock style={{ width: 'clamp(10px, 4cqi, 14px)', height: 'clamp(10px, 4cqi, 14px)' }} /> 
                {video.uploadTime}
             </span>
        </div>
      </div>
    </div>
  );
}
