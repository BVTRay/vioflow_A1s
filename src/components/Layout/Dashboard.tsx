import React from 'react';
import { useStore } from '../../App';
import { Project, Video } from '../../types';
import { MessageSquare, Upload, CheckCircle, FileVideo, Tag, Copyright, Eye, Package, Clock, Users, TrendingUp, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { useAuth } from '../../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { user } = useAuth();
  const { projects, videos, deliveries } = state;

  // 计算项目分类：直接按状态分类，并考虑时间排序
  const getActiveProjects = () => {
    const now = Date.now();
    
    // 解析时间字符串为时间戳（用于排序）
    const parseTime = (timeStr: string): number => {
      if (timeStr.includes('小时前')) {
        const hours = parseInt(timeStr.match(/(\d+)小时前/)?.[1] || '0');
        return now - hours * 60 * 60 * 1000;
      }
      if (timeStr.includes('分钟前')) {
        const minutes = parseInt(timeStr.match(/(\d+)分钟前/)?.[1] || '0');
        return now - minutes * 60 * 1000;
      }
      if (timeStr === '刚刚') {
        return now;
      }
      if (timeStr === '昨天') {
        return now - 24 * 60 * 60 * 1000;
      }
      const daysMatch = timeStr.match(/(\d+)天前/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        return now - days * 24 * 60 * 60 * 1000;
      }
      // 尝试解析日期字符串
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
      return 0;
    };

    // 正在进行的项目：status='active'，按最后活动时间排序
    const inProgressProjects = projects
      .filter(p => p.status === 'active')
      .sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    // 近期定版待交付：status='finalized'，按定版时间排序
    const finalizedProjects = projects
      .filter(p => p.status === 'finalized')
      .sort((a, b) => {
        const aTime = a.finalizedAt ? new Date(a.finalizedAt).getTime() : 0;
        const bTime = b.finalizedAt ? new Date(b.finalizedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    // 近期完成交付：status='delivered'，按交付时间排序
    const deliveredProjects = projects
      .filter(p => p.status === 'delivered')
      .sort((a, b) => {
        const aTime = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0;
        const bTime = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return { inProgressProjects, finalizedProjects, deliveredProjects };
  };

  const { inProgressProjects, finalizedProjects, deliveredProjects } = getActiveProjects();

  // 计算统计数据
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    finalizedProjects: projects.filter(p => p.status === 'finalized').length,
    deliveredProjects: projects.filter(p => p.status === 'delivered').length,
    totalVideos: videos.length,
    annotatedVideos: videos.filter(v => v.status === 'annotated').length,
    recentUploads: videos.filter(v => 
      v.uploadTime.includes('小时前') || v.uploadTime.includes('分钟前') || v.uploadTime === '刚刚' || v.uploadTime === '昨天'
    ).length
  };

  // 查看批注 - 打开审阅播放器
  const handleViewAnnotations = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'review' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
    // 找到有批注的视频并选中，然后打开审阅模式
    const annotatedVideo = videos.find(v => v.projectId === projectId && v.status === 'annotated');
    if (annotatedVideo) {
      dispatch({ type: 'SELECT_VIDEO', payload: annotatedVideo.id });
      dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: true });
    }
  };

  // 快速上传 - 打开操作台（审阅模块）
  const handleQuickUpload = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'review' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 确认定版
  const handleFinalize = (projectId: string) => {
    if (window.confirm("确认定版项目？这将锁定项目并移至交付阶段。")) {
      dispatch({ type: 'FINALIZE_PROJECT', payload: projectId });
      dispatch({ type: 'SELECT_PROJECT', payload: projectId });
      dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'delivery' });
      dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
    }
  };

  // 上传变体 - 打开操作台（交付模块）
  const handleUploadVariant = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'delivery' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 添加标签 - 打开操作台（交付模块）
  const handleAddTags = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'delivery' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 完善版权文件 - 打开操作台（交付模块）
  const handleCompleteCopyright = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'delivery' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 预览 - 打开操作台（交付模块，已交付项目）
  const handlePreview = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'delivery' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 案例打包 - 打开操作台（案例模块）
  const handlePackageShowcase = (projectId: string) => {
    dispatch({ type: 'SELECT_PROJECT', payload: projectId });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'showcase' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
    const projectVideos = videos.filter(v => v.projectId === projectId && v.isCaseFile);
    if (projectVideos.length > 0) {
      dispatch({ type: 'SET_FILTERED_SHOWCASE_VIDEOS', payload: projectVideos.map(v => v.id) });
    }
  };

  // 新建项目
  const handleNewProject = () => {
    dispatch({ type: 'SELECT_PROJECT', payload: '' });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'review' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  // 生成人性化问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '早上好';
    } else if (hour >= 12 && hour < 14) {
      return '中午好';
    } else if (hour >= 14 && hour < 18) {
      return '下午好';
    } else if (hour >= 18 && hour < 22) {
      return '晚上好';
    } else {
      return '夜深了';
    }
  };

  // 随机emoji
  const getRandomEmoji = () => {
    const emojis = ['✨', '🚀', '💼', '🎯', '⭐', '🌟', '💡', '🎨', '🔥', '💪'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  };

  const ProjectCard = ({ project, type }: { project: Project; type: 'active' | 'finalized' | 'delivered' }) => {
    const projectVideos = videos.filter(v => v.projectId === project.id);
    const annotatedCount = projectVideos.filter(v => v.status === 'annotated').length;
    const recentUploads = projectVideos.filter(v => 
      v.uploadTime.includes('小时前') || v.uploadTime.includes('分钟前') || v.uploadTime === '刚刚' || v.uploadTime === '昨天'
    ).length;
    const totalVideos = projectVideos.length;
    
    // 获取项目预览图（使用第一个视频的预览图，如果没有则使用占位图）
    const firstVideo = projectVideos[0];
    const thumbnailUrl = firstVideo?.thumbnailUrl || `https://picsum.photos/seed/${project.id}/400/225`;

    // 状态颜色配置（恢复颜色区分，但保持半透明）
    const statusConfig = {
      active: { 
        bg: 'bg-indigo-500/10', 
        border: 'border-indigo-500/30', 
        text: 'text-indigo-400', 
        label: '进行中',
        cardBorder: 'border-indigo-500/20'
      },
      finalized: { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/30', 
        text: 'text-amber-400', 
        label: '已定版',
        cardBorder: 'border-amber-500/20'
      },
      delivered: { 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/30', 
        text: 'text-emerald-400', 
        label: '已交付',
        cardBorder: 'border-emerald-500/20'
      }
    };
    const config = statusConfig[type];

    return (
      <div className={`${theme.bg.secondary}/50 border ${config.cardBorder} rounded-lg overflow-hidden hover:border-opacity-50 ${theme.bg.hover} transition-all duration-200 shadow-sm`}>
        {/* 预览图 */}
        <div className={`w-full aspect-[16/9] ${theme.bg.tertiary} overflow-hidden`}>
          <img 
            src={thumbnailUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-2">
          {/* 头部：项目名称和状态 */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <h3 className="text-[10px] font-semibold text-zinc-100 truncate">
                  {project.name}
                </h3>
                <span className={`px-1 py-0.5 h-3.5 rounded text-[8px] font-medium ${config.bg} ${config.border} ${config.text} border whitespace-nowrap flex items-center`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                <span className="flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  {project.client}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {project.createdDate}
                </span>
              </div>
            </div>
          </div>

        {/* 项目统计 */}
        <div className="mb-2 pb-2 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 text-[9px]">
            <div className="flex items-center gap-0.5 text-zinc-400 whitespace-nowrap">
              <FileVideo className="w-2.5 h-2.5" />
              <span>{totalVideos} 个视频</span>
            </div>
            {annotatedCount > 0 && (
              <div className="flex items-center gap-0.5 text-zinc-400 whitespace-nowrap">
                <MessageSquare className="w-2.5 h-2.5" />
                <span>{annotatedCount} 条批注</span>
              </div>
            )}
            {recentUploads > 0 && (
              <div className="flex items-center gap-0.5 text-zinc-400 whitespace-nowrap">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>{recentUploads} 个新上传</span>
              </div>
            )}
          </div>
        </div>

          {/* 快捷操作 */}
          <div className="flex flex-wrap gap-1">
            {type === 'active' && (
              <>
                {annotatedCount > 0 && (
                  <button
                    onClick={() => handleViewAnnotations(project.id)}
                    className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                    title="查看批注"
                  >
                    <MessageSquare className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                    <span className="hidden xl:inline">查看批注</span>
                  </button>
                )}
                <button
                  onClick={() => handleQuickUpload(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="快速上传"
                >
                  <Upload className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">快速上传</span>
                </button>
                <button
                  onClick={() => handleFinalize(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="确认定版"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">确认定版</span>
                </button>
              </>
            )}
            {type === 'finalized' && (
              <>
                <button
                  onClick={() => handleUploadVariant(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="上传变体"
                >
                  <Upload className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">上传变体</span>
                </button>
                <button
                  onClick={() => handleAddTags(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="添加标签"
                >
                  <Tag className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">添加标签</span>
                </button>
                <button
                  onClick={() => handleCompleteCopyright(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="完善版权"
                >
                  <Copyright className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">完善版权</span>
                </button>
              </>
            )}
            {type === 'delivered' && (
              <>
                <button
                  onClick={() => handlePreview(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="预览"
                >
                  <Eye className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">预览</span>
                </button>
                <button
                  onClick={() => handleAddTags(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="添加标签"
                >
                  <Tag className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">添加标签</span>
                </button>
                <button
                  onClick={() => handlePackageShowcase(project.id)}
                  className="px-1.5 py-0.5 xl:px-2 xl:py-1 h-5 xl:h-6 bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 rounded text-[9px] transition-all flex items-center gap-0.5 xl:gap-1 font-medium whitespace-nowrap"
                  title="案例打包"
                >
                  <Package className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
                  <span className="hidden xl:inline">案例打包</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`fixed inset-0 pt-14 pl-20 ${theme.bg.primary} overflow-y-auto`}>
        <div className="px-4 py-8">
          {/* 欢迎语和统计面板 */}
          <div className="mb-8">
            <div className="mb-6">
              <p className="text-lg font-medium text-zinc-200 mb-1.5">
                Hi～{user?.name || '用户'}  {getGreeting()}
              </p>
              <p className="text-zinc-400">
                在纷呈工作台快速定位你近期的项目 {getRandomEmoji()}
              </p>
            </div>

            {/* 统计卡片 */}
            <div className="flex items-start gap-2 mb-8">
              <button
                onClick={handleNewProject}
                className={`${theme.bg.secondary}/30 border ${theme.border.secondary}/50 rounded-xl p-2.5 ${theme.border.hover} ${theme.bg.hover} transition-all flex flex-col items-center justify-center gap-1.5 h-[80px] w-[120px]`}
              >
                <Upload className="w-4 h-4 text-zinc-400" />
                <span className="text-[10px] font-medium text-zinc-300 whitespace-nowrap">新建项目</span>
              </button>
              
              <div className="flex gap-2">
                <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 rounded-xl p-2.5 flex flex-col h-[80px] w-[120px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">进行中</span>
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold text-indigo-300 whitespace-nowrap">{stats.activeProjects}</div>
                    <div className="text-[9px] text-zinc-500 whitespace-nowrap">个项目</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-2.5 flex flex-col h-[80px] w-[120px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">待交付</span>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold text-amber-300 whitespace-nowrap">{stats.finalizedProjects}</div>
                    <div className="text-[9px] text-zinc-500 whitespace-nowrap">个项目</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-2.5 flex flex-col h-[80px] w-[120px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">已交付</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold text-emerald-300 whitespace-nowrap">{stats.deliveredProjects}</div>
                    <div className="text-[9px] text-zinc-500 whitespace-nowrap">个项目</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/30 rounded-xl p-2.5 flex flex-col h-[80px] w-[120px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">总视频</span>
                    <FileVideo className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold text-zinc-300 whitespace-nowrap">{stats.totalVideos}</div>
                    <div className="text-[9px] text-zinc-500 whitespace-nowrap">个文件</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 第一部分：正在进行的项目 */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-indigo-500/5 to-indigo-600/3 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                  正在进行的项目
                </h2>
                <span className="text-xs text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded-full border border-indigo-500/30">
                  {inProgressProjects.length}
                </span>
              </div>
              {inProgressProjects.length === 0 ? (
                <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>暂无正在进行的项目</p>
                  <p className="text-xs text-zinc-600 mt-1">点击上方"新建项目"按钮开始</p>
                </div>
              ) : (
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '520px' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pr-2">
                    {inProgressProjects.map(project => (
                      <ProjectCard key={project.id} project={project} type="active" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 第二部分：近期定版但未交付的项目 */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-amber-500/5 to-amber-600/3 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                  近期定版待交付
                </h2>
                <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full border border-amber-500/30">
                  {finalizedProjects.length}
                </span>
              </div>
              {finalizedProjects.length === 0 ? (
                <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <CheckCircle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>暂无定版待交付的项目</p>
                </div>
              ) : (
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '520px' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pr-2">
                    {finalizedProjects.map(project => (
                      <ProjectCard key={project.id} project={project} type="finalized" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 第三部分：近期完成交付的项目 */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/3 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-emerald-300 flex items-center gap-2">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                  近期完成交付
                </h2>
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                  {deliveredProjects.length}
                </span>
              </div>
              {deliveredProjects.length === 0 ? (
                <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p>暂无完成交付的项目</p>
                </div>
              ) : (
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '520px' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pr-2">
                    {deliveredProjects.map(project => (
                      <ProjectCard key={project.id} project={project} type="delivered" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
