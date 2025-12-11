import React from 'react';
import { useStore } from '../../App';
import { Project, Video } from '../../types';
import { MessageSquare, Upload, CheckCircle, FileVideo, Tag, Copyright, Eye, Package, Clock, Users, TrendingUp, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useStore();
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
    dispatch({ type: 'SELECT_PROJECT', payload: null });
    dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'review' });
    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
  };

  const ProjectCard = ({ project, type }: { project: Project; type: 'active' | 'finalized' | 'delivered' }) => {
    const projectVideos = videos.filter(v => v.projectId === project.id);
    const annotatedCount = projectVideos.filter(v => v.status === 'annotated').length;
    const recentUploads = projectVideos.filter(v => 
      v.uploadTime.includes('小时前') || v.uploadTime.includes('分钟前') || v.uploadTime === '刚刚' || v.uploadTime === '昨天'
    ).length;
    const totalVideos = projectVideos.length;

    // 状态颜色配置
    const statusConfig = {
      active: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', label: '进行中' },
      finalized: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: '已定版' },
      delivered: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: '已交付' }
    };
    const config = statusConfig[type];

    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-black/20">
        {/* 头部：项目名称和状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">
                {project.name}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.border} ${config.text} border`}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {project.client}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {project.createdDate}
              </span>
            </div>
          </div>
        </div>

        {/* 项目统计 */}
        <div className="mb-4 pb-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <FileVideo className="w-3.5 h-3.5" />
              <span>{totalVideos} 个视频</span>
            </div>
            {annotatedCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{annotatedCount} 条批注</span>
              </div>
            )}
            {recentUploads > 0 && (
              <div className="flex items-center gap-1.5 text-indigo-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{recentUploads} 个新上传</span>
              </div>
            )}
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-2">
          {type === 'active' && (
            <>
              {annotatedCount > 0 && (
                <button
                  onClick={() => handleViewAnnotations(project.id)}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  查看批注
                </button>
              )}
              <button
                onClick={() => handleQuickUpload(project.id)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium shadow-lg shadow-indigo-900/20"
              >
                <Upload className="w-3.5 h-3.5" />
                快速上传
              </button>
              <button
                onClick={() => handleFinalize(project.id)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium shadow-lg shadow-emerald-900/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                确认定版
              </button>
            </>
          )}
          {type === 'finalized' && (
            <>
              <button
                onClick={() => handleUploadVariant(project.id)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium shadow-lg shadow-indigo-900/20"
              >
                <Upload className="w-3.5 h-3.5" />
                上传变体
              </button>
              <button
                onClick={() => handleAddTags(project.id)}
                className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                添加标签
              </button>
              <button
                onClick={() => handleCompleteCopyright(project.id)}
                className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium"
              >
                <Copyright className="w-3.5 h-3.5" />
                完善版权
              </button>
            </>
          )}
          {type === 'delivered' && (
            <>
              <button
                onClick={() => handlePreview(project.id)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium shadow-lg shadow-indigo-900/20"
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
              <button
                onClick={() => handleAddTags(project.id)}
                className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                添加标签
              </button>
              <button
                onClick={() => handlePackageShowcase(project.id)}
                className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs transition-all flex items-center gap-1.5 font-medium"
              >
                <Package className="w-3.5 h-3.5" />
                案例打包
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 pt-14 pl-64 bg-zinc-950 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* 欢迎语和统计面板 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-zinc-100 mb-1.5">工作台</h1>
                <p className="text-zinc-400">欢迎回来，这里是您的工作中心</p>
              </div>
              <button
                onClick={handleNewProject}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-all flex items-center gap-2 font-medium shadow-lg shadow-indigo-900/20"
              >
                <Upload className="w-4 h-4" />
                新建项目
              </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">进行中</span>
                  <FolderOpen className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-indigo-300">{stats.activeProjects}</div>
                <div className="text-[10px] text-zinc-500 mt-1">个项目</div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">待交付</span>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300">{stats.finalizedProjects}</div>
                <div className="text-[10px] text-zinc-500 mt-1">个项目</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">已交付</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-300">{stats.deliveredProjects}</div>
                <div className="text-[10px] text-zinc-500 mt-1">个项目</div>
              </div>
              
              <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/30 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">总视频</span>
                  <FileVideo className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-300">{stats.totalVideos}</div>
                <div className="text-[10px] text-zinc-500 mt-1">个文件</div>
              </div>
            </div>
          </div>

          {/* 第一部分：正在进行的项目 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                正在进行的项目
              </h2>
              <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                {inProgressProjects.length}
              </span>
            </div>
            {inProgressProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <FolderOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>暂无正在进行的项目</p>
                <p className="text-xs text-zinc-600 mt-1">点击上方"新建项目"按钮开始</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {inProgressProjects.map(project => (
                  <ProjectCard key={project.id} project={project} type="active" />
                ))}
              </div>
            )}
          </div>

          {/* 第二部分：近期定版但未交付的项目 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                近期定版待交付
              </h2>
              <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                {finalizedProjects.length}
              </span>
            </div>
            {finalizedProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <CheckCircle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>暂无定版待交付的项目</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {finalizedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} type="finalized" />
                ))}
              </div>
            )}
          </div>

          {/* 第三部分：近期完成交付的项目 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                近期完成交付
              </h2>
              <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
                {deliveredProjects.length}
              </span>
            </div>
            {deliveredProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>暂无完成交付的项目</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {deliveredProjects.map(project => (
                  <ProjectCard key={project.id} project={project} type="delivered" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
