import React from 'react';
import { useStore } from '../../App';
import { Project, Video } from '../../types';
import { MessageSquare, Upload, CheckCircle, FileVideo, Tag, Copyright, Eye, Package, Clock, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useStore();
  const { projects, videos, deliveries } = state;

  // 计算活跃项目：产生批注的、最近上传、最近定版待交付、最近交付的
  const getActiveProjects = () => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // 获取有批注的项目
    const projectsWithAnnotations = projects.filter(project => {
      return videos.some(v => 
        v.projectId === project.id && v.status === 'annotated'
      );
    });

    // 获取最近上传的项目（最近7天）
    const recentUploadProjects = projects.filter(project => {
      return videos.some(v => {
        if (v.projectId !== project.id) return false;
        const uploadTime = v.uploadTime;
        if (uploadTime.includes('小时前') || uploadTime.includes('分钟前') || uploadTime === '刚刚') {
          return true;
        }
        if (uploadTime === '昨天') {
          return true;
        }
        const daysMatch = uploadTime.match(/(\d+)天前/);
        if (daysMatch && parseInt(daysMatch[1]) <= 7) {
          return true;
        }
        return false;
      });
    });

    // 获取最近定版的项目（status='finalized'，且最近7天内定版）
    const recentFinalizedProjects = projects.filter(project => {
      if (project.status !== 'finalized') return false;
      // 简单判断：如果有 finalizedAt 字段，检查是否在7天内
      // 否则检查是否有最近的活动
      const projectVideos = videos.filter(v => v.projectId === project.id);
      if (projectVideos.length === 0) return false;
      // 如果项目中有最近的活动，认为是近期定版
      return projectVideos.some(v => {
        const uploadTime = v.uploadTime;
        if (uploadTime.includes('小时前') || uploadTime.includes('分钟前') || uploadTime === '刚刚') {
          return true;
        }
        if (uploadTime === '昨天') {
          return true;
        }
        const daysMatch = uploadTime.match(/(\d+)天前/);
        if (daysMatch && parseInt(daysMatch[1]) <= 7) {
          return true;
        }
        return false;
      });
    });

    // 获取最近交付的项目（status='delivered'，且最近7天内交付）
    const recentDeliveredProjects = projects.filter(project => {
      if (project.status !== 'delivered') return false;
      const delivery = deliveries.find(d => d.projectId === project.id);
      if (!delivery || !delivery.sentDate) return false;
      // 简单判断：如果有 sentDate，认为是近期交付
      // 实际应该解析日期，这里简化处理
      return true;
    });

    // 合并所有活跃项目ID
    const activeProjectIds = new Set([
      ...projectsWithAnnotations.map(p => p.id),
      ...recentUploadProjects.map(p => p.id),
      ...recentFinalizedProjects.map(p => p.id),
      ...recentDeliveredProjects.map(p => p.id)
    ]);

    // 分类项目
    const activeProjects = projects.filter(p => activeProjectIds.has(p.id));
    const inProgressProjects = activeProjects.filter(p => p.status === 'active').slice(0, 10);
    const finalizedProjects = activeProjects.filter(p => p.status === 'finalized').slice(0, 10);
    const deliveredProjects = activeProjects.filter(p => p.status === 'delivered').slice(0, 10);

    return { inProgressProjects, finalizedProjects, deliveredProjects };
  };

  const { inProgressProjects, finalizedProjects, deliveredProjects } = getActiveProjects();

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

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-200 truncate mb-1">
              {project.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {project.client}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {project.createdDate}
              </span>
            </div>
          </div>
        </div>

        {/* 活跃指标 */}
        {(annotatedCount > 0 || recentUploads > 0) && (
          <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
            {annotatedCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-amber-500" />
                {annotatedCount} 条批注
              </span>
            )}
            {recentUploads > 0 && (
              <span className="flex items-center gap-1">
                <FileVideo className="w-3 h-3 text-indigo-500" />
                {recentUploads} 个新上传
              </span>
            )}
          </div>
        )}

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-2">
          {type === 'active' && (
            <>
              {annotatedCount > 0 && (
                <button
                  onClick={() => handleViewAnnotations(project.id)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3" />
                  查看批注
                </button>
              )}
              <button
                onClick={() => handleQuickUpload(project.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                快速上传
              </button>
              <button
                onClick={() => handleFinalize(project.id)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-3 h-3" />
                确认定版
              </button>
            </>
          )}
          {type === 'finalized' && (
            <>
              <button
                onClick={() => handleUploadVariant(project.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                上传变体
              </button>
              <button
                onClick={() => handleAddTags(project.id)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Tag className="w-3 h-3" />
                添加标签
              </button>
              <button
                onClick={() => handleCompleteCopyright(project.id)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Copyright className="w-3 h-3" />
                完善版权
              </button>
            </>
          )}
          {type === 'delivered' && (
            <>
              <button
                onClick={() => handlePreview(project.id)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Eye className="w-3 h-3" />
                预览
              </button>
              <button
                onClick={() => handleAddTags(project.id)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Tag className="w-3 h-3" />
                添加标签
              </button>
              <button
                onClick={() => handlePackageShowcase(project.id)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Package className="w-3 h-3" />
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
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* 欢迎语 */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-zinc-100 mb-2">工作台</h1>
            <p className="text-zinc-400 text-lg">欢迎回来，这里是您的工作中心</p>
          </div>

          {/* 第一部分：正在进行的项目 */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-zinc-200">正在进行的项目</h2>
              <button
                onClick={handleNewProject}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                新建项目
              </button>
            </div>
            {inProgressProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 text-center bg-zinc-900 border border-zinc-800 rounded-lg">
                暂无正在进行的项目
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressProjects.map(project => (
                  <ProjectCard key={project.id} project={project} type="active" />
                ))}
              </div>
            )}
          </div>

          {/* 第二部分：近期定版但未交付的项目 */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-200 mb-6">近期定版待交付</h2>
            {finalizedProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 text-center bg-zinc-900 border border-zinc-800 rounded-lg">
                暂无定版待交付的项目
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {finalizedProjects.map(project => (
                  <ProjectCard key={project.id} project={project} type="finalized" />
                ))}
              </div>
            )}
          </div>

          {/* 第三部分：近期完成交付的项目 */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-zinc-200 mb-6">近期完成交付</h2>
            {deliveredProjects.length === 0 ? (
              <div className="text-zinc-500 text-sm py-8 text-center bg-zinc-900 border border-zinc-800 rounded-lg">
                暂无完成交付的项目
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
