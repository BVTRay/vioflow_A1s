
import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Folder, MoreHorizontal, Check, Archive, Calendar, LayoutGrid, Clapperboard, X, ChevronDown, User, Users, PlayCircle, Settings, Trash2, Lock, PlusCircle, Share2, ChevronLeft, ChevronRight, CheckSquare, Square, Tag, XCircle, Shield, FolderOpen, FileVideo, Loader2, Send } from 'lucide-react';
import { useStore } from '../../App';
import { Project } from '../../types';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { Modal } from '../UI/Modal';
import { useToast } from '../../hooks/useToast';

// Utility for highlighting text
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="text-indigo-400 font-bold bg-indigo-500/10 rounded px-0.5">{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

/**
 * RetrievalPanel 检索面板组件
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
 *    - 主浏览区切换为资源管理器视图，按组/项目层级展示所有内容
 *    - 类似文件资源管理器，可以浏览整个项目结构
 *    - 适用于需要查看完整项目结构的场景
 */
export const RetrievalPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const { activeModule, projects, selectedProjectId, searchTerm, activeTag, videos, selectedShareProjects, isRetrievalPanelVisible, shareMultiSelectMode, selectedShareProjectId, isTagPanelExpanded, selectedGroupTag, selectedGroupTags, isTagMultiSelectMode, tags, settingsActiveTab } = state;
  const theme = useThemeClasses();
  const toast = useToast();

  // View Mode State
  const [viewMode, setViewMode] = useState<'month' | 'group'>('month');

  // 分组视图折叠状态：记录哪些组是折叠的
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // 切换组的折叠状态
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Split View Resizing Logic
  const [splitRatio, setSplitRatio] = useState(66); // Percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  
  // Modal State (Combined Create & Edit)
  const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      mode: 'create' | 'edit';
      editingProjectId?: string;
  }>({ isOpen: false, mode: 'create' });
  
  // Loading states
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  // Unlock Modal State (For Finalized Projects)
  const [unlockModal, setUnlockModal] = useState<{
      isOpen: boolean;
      project?: Project;
      justification: string;
  }>({ isOpen: false, justification: '' });

  const [formData, setFormData] = useState({ 
      name: '', 
      client: '', 
      lead: '',
      postLead: '',
      group: '',
      isNewGroup: false,
      team: [] as string[],
      newMemberInput: ''
  });

  // Resizing Handlers
  const handleMouseDown = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - containerRect.top;
    const percentage = (relativeY / containerRect.height) * 100;
    setSplitRatio(Math.min(Math.max(percentage, 20), 80));
  };
  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  // Logic: Create / Edit Setup
  const handleOpenCreateModal = () => {
    // 在审阅模块下，只打开操作台的新建项目窗口，不打开 Modal
    if (activeModule === 'review') {
      // 清除选中的项目，确保显示新建项目表单
      dispatch({ type: 'SELECT_PROJECT', payload: null });
      dispatch({ type: 'SELECT_VIDEO', payload: null });
      // 统一入口：新建项目
      dispatch({ 
        type: 'OPEN_WORKBENCH_VIEW', 
        payload: { view: 'newProject', context: { from: 'retrieval-panel' } } 
      });
      return;
    }
    
    // 其他模块下，打开 Modal
    const date = new Date();
    // YYMM Format: 2405 (May 2024)
    const prefix = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}_`;
    
    // 使用第一个可用分组作为默认值
    const defaultGroup = existingGroups[0] || '未分类';
    setFormData({ 
        name: prefix, 
        client: '', 
        lead: '',
        postLead: '',
        group: defaultGroup,
        isNewGroup: false,
        team: [],
        newMemberInput: ''
    });
    setModalConfig({ isOpen: true, mode: 'create' });
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      
      // Protection Logic: If Finalized, show Unlock Warning
      if (project.status === 'finalized' || project.status === 'delivered') {
          setUnlockModal({
              isOpen: true,
              project,
              justification: ''
          });
          return;
      }

      // 在审阅模块下，在操作台中显示项目设置，而不是弹窗
      if (activeModule === 'review') {
          // 清除选中的视频，确保显示项目设置而不是视频详情
          dispatch({ type: 'SELECT_VIDEO', payload: null });
          // 选中项目并打开操作台
          dispatch({ type: 'SELECT_PROJECT', payload: project.id });
      dispatch({ 
        type: 'OPEN_WORKBENCH_VIEW', 
        payload: { view: 'projectSettings', context: { projectId: project.id, from: 'retrieval-panel' } } 
      });
          return;
      }

      // 其他模块下，打开 Modal
      handleOpenEditModal(project);
  };

  const handleOpenEditModal = (project: Project) => {
      setFormData({
          name: project.name,
          client: project.client,
          lead: project.lead,
          postLead: project.postLead,
          group: project.group,
          isNewGroup: false,
          team: project.team || [],
          newMemberInput: ''
      });
      setModalConfig({ isOpen: true, mode: 'edit', editingProjectId: project.id });
  };

  const handleConfirmUnlock = () => {
      if (unlockModal.justification.trim() && unlockModal.project) {
          // Log logic could go here
          // Close Unlock Modal and Open Edit Modal
          const proj = unlockModal.project;
          setUnlockModal({ isOpen: false, justification: '', project: undefined });
          handleOpenEditModal(proj);
      }
  };

  const handleConfirmModal = async () => {
    if (!formData.name) return;

    if (modalConfig.mode === 'create') {
        // 保存表单数据用于后台创建
        const formDataToSubmit = { ...formData };
        
        // 立即关闭模态框
        setModalConfig({ ...modalConfig, isOpen: false });
        
        // 显示创建中的 toast
        const loadingToastId = toast.info(`正在创建项目「${formDataToSubmit.name}」...`, { duration: 0 });
        
        try {
          // 调用 API 创建项目（自动使用当前团队的 teamId）
          const { projectsApi } = await import('../../api/projects');
          const newProject = await projectsApi.create({
            name: formDataToSubmit.name,
            client: formDataToSubmit.client || '客户',
            lead: formDataToSubmit.lead || '待定',
            postLead: formDataToSubmit.postLead || '待定',
            group: formDataToSubmit.group || '未分类',
          }).catch((error) => {
            console.error('创建项目失败:', error);
            console.error('错误详情:', error.response?.data || error.message);
            throw error;
          });
          
          // 关闭加载提示
          if (loadingToastId) toast.close(loadingToastId);
          
          // 添加到本地状态
          dispatch({
            type: 'ADD_PROJECT',
            payload: {
              id: newProject.id,
              name: newProject.name,
              client: newProject.client || formDataToSubmit.client || '客户',
              lead: newProject.lead || formDataToSubmit.lead || '待定',
              postLead: newProject.postLead || formDataToSubmit.postLead || '待定',
              group: newProject.group || formDataToSubmit.group || '未分类',
              status: newProject.status || 'active',
              createdDate: newProject.created_date || new Date().toISOString().split('T')[0],
              team: formDataToSubmit.team
            }
          });
          
          // 显示成功提示
          toast.success(`项目「${formDataToSubmit.name}」创建成功！`);
        } catch (error: any) {
          // 关闭加载提示
          if (loadingToastId) toast.close(loadingToastId);
          console.error('Failed to create project:', error);
          const errorMessage = error?.response?.data?.message || error?.message || '创建项目失败，请重试';
          console.error('错误详情:', error?.response?.data || error);
          toast.error(`项目「${formDataToSubmit.name}」创建失败: ${errorMessage}`);
        }
    } else if (modalConfig.mode === 'edit' && modalConfig.editingProjectId) {
        setIsUpdatingProject(true);
        const loadingToastId = toast.info('正在更新项目设置...', { duration: 0 });
        
        try {
          // Find existing to preserve ID and Status and CreatedDate
          const existing = projects.find(p => p.id === modalConfig.editingProjectId);
          if (existing) {
              dispatch({
                  type: 'UPDATE_PROJECT',
                  payload: {
                      ...existing,
                      name: formData.name,
                      client: formData.client,
                      lead: formData.lead,
                      postLead: formData.postLead,
                      group: formData.group,
                      team: formData.team
                  }
              });
              
              // 关闭加载提示
              if (loadingToastId) toast.close(loadingToastId);
              toast.success('项目设置已更新');
          }
        } catch (error: any) {
          // 关闭加载提示
          if (loadingToastId) toast.close(loadingToastId);
          console.error('Failed to update project:', error);
          toast.error('更新项目设置失败，请重试');
        } finally {
          setIsUpdatingProject(false);
        }
    }
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const handleAddTeamMember = () => {
      if (formData.newMemberInput.trim()) {
          setFormData({
              ...formData,
              team: [...formData.team, formData.newMemberInput.trim()],
              newMemberInput: ''
          });
      }
  };

  const handleRemoveTeamMember = (member: string) => {
      setFormData({
          ...formData,
          team: formData.team.filter(m => m !== member)
      });
  };

  // Get unique existing groups for dropdown (包含预设分组)
  const getPresetGroups = (): string[] => {
    try {
      const saved = localStorage.getItem('preset_project_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };
  const projectGroupNames = projects.map(p => p.group).filter(g => g && g !== '未分类');
  const existingGroups = Array.from(new Set([...projectGroupNames, ...getPresetGroups()]));

  // 【排序辅助函数】
  // 从项目名称中提取月份序号（例如 "2405_xxx" -> 2405）
  const getMonthSequence = (projectName: string): number => {
    const match = projectName.match(/^(\d{4})_/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // 项目排序函数：按月份序号倒序，同月份按创建时间倒序
  const sortProjectsByMonthAndCreatedDate = (projectList: Project[]): Project[] => {
    return [...projectList].sort((a, b) => {
      // 首先按月份序号排序（最新的在前）
      const monthA = getMonthSequence(a.name);
      const monthB = getMonthSequence(b.name);
      if (monthB !== monthA) {
        return monthB - monthA;
      }
      // 月份序号相同时，按创建时间排序（最新创建的在前）
      const dateA = new Date(a.createdDate).getTime();
      const dateB = new Date(b.createdDate).getTime();
      return dateB - dateA;
    });
  };

  // 分组视图排序函数：进行中的项目排在最上面，然后按月份序号和创建时间排序
  const sortProjectsForGroupView = (projectList: Project[]): Project[] => {
    return [...projectList].sort((a, b) => {
      // 首先按状态排序：active 的排在最前面
      const statusA = a.status === 'active' ? 0 : 1;
      const statusB = b.status === 'active' ? 0 : 1;
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      // 状态相同时，按月份序号排序（最新的在前）
      const monthA = getMonthSequence(a.name);
      const monthB = getMonthSequence(b.name);
      if (monthB !== monthA) {
        return monthB - monthA;
      }
      // 月份序号也相同时，按创建时间排序（最新创建的在前）
      const dateA = new Date(a.createdDate).getTime();
      const dateB = new Date(b.createdDate).getTime();
      return dateB - dateA;
    });
  };

  // Get all system tags for tag filtering
  const systemTags = tags || [];

  // Filtering
  let filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Apply tag filter - filter projects that have videos with the selected tag(s)
  const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
    ? selectedGroupTags 
    : selectedGroupTag 
      ? [selectedGroupTag] 
      : [];
  
  if (tagsToFilter.length > 0) {
    const projectIdsWithTag = new Set<string>();
    const selectedTagIds = tagsToFilter.map(tagName => {
      const tag = tags.find(t => t.name === tagName);
      return tag?.id;
    }).filter(Boolean) as string[];
    
    videos.forEach(v => {
      // Check if video has any of the selected tags (OR logic)
      const hasTag = tagsToFilter.some(tagName => {
        const tag = tags.find(t => t.name === tagName);
        return v.tags?.includes(tagName) || (tag && v.tagIds?.includes(tag.id));
      });
      if (hasTag && v.projectId) {
        projectIdsWithTag.add(v.projectId);
      }
    });
    filteredProjects = filteredProjects.filter(p => projectIdsWithTag.has(p.id));
  }

  // Helper function to get matched tags for a project
  const getMatchedTagsForProject = (projectId: string): string[] => {
    const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
      ? selectedGroupTags 
      : selectedGroupTag 
        ? [selectedGroupTag] 
        : [];
    
    if (tagsToFilter.length === 0) return [];
    
    const projectVideos = videos.filter(v => v.projectId === projectId);
    const matchedTags: string[] = [];
    
    tagsToFilter.forEach(tagName => {
      const tag = tags.find(t => t.name === tagName);
      const hasTag = projectVideos.some(v => 
        v.tags?.includes(tagName) || (tag && v.tagIds?.includes(tag.id))
      );
      if (hasTag) {
        matchedTags.push(tagName);
      }
    });
    
    return matchedTags;
  };

  // Helper function to get matched tags for a video
  const getMatchedTagsForVideo = (video: typeof videos[0]): string[] => {
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

  // Renderers
  const renderProjectItem = (project: Project, icon: React.ReactNode) => {
    // 分享模块
    if (activeModule === 'share') {
      // 多选模式
      if (shareMultiSelectMode) {
        const isSelected = selectedShareProjects.includes(project.id);
        return (
          <div 
            key={project.id}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_SHARE_PROJECT', payload: project.id });
            }}
            className={`group flex items-center justify-between py-2 px-2.5 rounded-md cursor-pointer transition-all mb-0.5 relative
            ${isSelected
                ? 'bg-indigo-500/10 text-indigo-100 border border-indigo-500/20' 
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Checkbox */}
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected 
                  ? 'bg-indigo-500 border-indigo-500' 
                  : 'border-zinc-600 hover:border-indigo-500'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              
              {/* Name with Highlight */}
              <span className="text-sm truncate font-medium leading-none pb-0.5" title={project.name}>
                  <HighlightText text={project.name} highlight={searchTerm} />
              </span>
            </div>
          </div>
        );
      }
      // 单选模式
      else {
        const isSelected = selectedShareProjectId === project.id;
        return (
          <div 
            key={project.id}
            onClick={() => dispatch({ type: 'SELECT_SHARE_PROJECT', payload: project.id })}
            className={`group flex items-center justify-between py-2 px-2.5 rounded-md cursor-pointer transition-all mb-0.5 relative
            ${isSelected
                ? 'bg-indigo-500/10 text-indigo-100 border border-indigo-500/20' 
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Name with Highlight */}
              <span className="text-sm truncate font-medium leading-none pb-0.5" title={project.name}>
                  <HighlightText text={project.name} highlight={searchTerm} />
              </span>
            </div>
          </div>
        );
      }
    }
    
    // 其他模块：单选模式
    return (
      <div 
          key={project.id}
          onClick={() => dispatch({ type: 'SELECT_PROJECT', payload: project.id })}
          className={`group flex items-center justify-between py-2 px-2.5 rounded-md cursor-pointer transition-all mb-0.5 relative
          ${selectedProjectId === project.id 
              ? 'bg-indigo-500/10 text-indigo-100 border border-indigo-500/20' 
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Status Dot */}
          {activeModule === 'review' && (
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-sm ${
                  project.status === 'active' 
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' 
                      : project.status === 'finalized' 
                          ? 'bg-orange-500' 
                          : 'bg-zinc-600'
              }`} title={project.status} />
          )}
          
          {/* Name with Highlight */}
          <span className="text-sm truncate font-medium leading-none pb-0.5" title={project.name}>
              <HighlightText text={project.name} highlight={searchTerm} />
          </span>
        </div>
        
        {/* Hover Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           {activeModule === 'review' && (
               <button 
                  onClick={(e) => handleEditClick(e, project)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-indigo-400"
                  title={project.status === 'finalized' ? "解锁并编辑" : "项目设置"}
               >
                  {project.status === 'finalized' ? <Lock className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
               </button>
           )}
           {/* 交付模块：待交付项目显示发起交付按钮 */}
           {activeModule === 'delivery' && project.status === 'finalized' && (
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'SELECT_PROJECT', payload: project.id });
                    dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                  }}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-white shadow-sm shadow-indigo-900/30 transition-all hover:scale-105"
                  title="发起交付"
               >
                  <Send className="w-3 h-3" />
               </button>
           )}
        </div>
      </div>
    );
  };

  // --- MODULE TREES ---

  // 1. REVIEW
  const renderReviewTree = () => {
    const active = filteredProjects.filter(p => p.status === 'active');
    const finalized = filteredProjects.filter(p => p.status === 'finalized');

    // 按月份分组进行中项目
    const activeMonths: Record<string, Project[]> = {};
    active.forEach(p => {
      const date = new Date(p.createdDate);
      const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
      if (!activeMonths[key]) activeMonths[key] = [];
      activeMonths[key].push(p);
    });

    // 按月份分组已定版项目
    const finalizedMonths: Record<string, Project[]> = {};
    finalized.forEach(p => {
      const date = new Date(p.createdDate);
      const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
      if (!finalizedMonths[key]) finalizedMonths[key] = [];
      finalizedMonths[key].push(p);
    });

    return (
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0 relative">
            {/* Top: Active Projects */}
            <div style={{ height: `${splitRatio}%` }} className="overflow-y-auto p-3 custom-scrollbar">
                <div className={`text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    进行中项目
                </div>
                {Object.keys(activeMonths).length === 0 ? (
                  <div className={`text-xs ${theme.text.muted} italic px-2`}>无进行中项目</div>
                ) : (
                  Object.entries(activeMonths).sort(([a], [b]) => {
                    // 按年月倒序排列（最新的在前）
                    const dateA = new Date(a.replace('年', '-').replace('月', ''));
                    const dateB = new Date(b.replace('年', '-').replace('月', ''));
                    return dateB.getTime() - dateA.getTime();
                  }).map(([month, monthProjects]) => (
                    <div key={month} className="mb-6">
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1.5 z-10 border-b ${theme.border.primary}`}>
                        <Calendar className="w-3 h-3" />
                        {month}
                        <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthProjects.length}</span>
                      </div>
                      <div className="space-y-0.5">
                        {/* 月份内按序号和创建时间排序 */}
                        {sortProjectsByMonthAndCreatedDate(monthProjects).map(p => renderProjectItem(p, null))}
                      </div>
                    </div>
                  ))
                )}
            </div>

            {/* Resizer */}
            <div 
                onMouseDown={handleMouseDown}
                className={`h-1 ${theme.bg.tertiary} border-y ${theme.border.primary} cursor-row-resize hover:bg-indigo-500/20 flex justify-center items-center group shrink-0 z-10`}
            >
                <div className={`w-8 h-1 ${theme.bg.secondary} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </div>

            {/* Bottom: Finalized Projects */}
            <div className={`flex-1 overflow-y-auto p-3 ${theme.bg.secondary} custom-scrollbar`}>
                 <div className={`text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    已定版 / 锁定
                </div>
                {Object.keys(finalizedMonths).length === 0 ? (
                  <div className={`text-xs ${theme.text.muted} italic px-2`}>无已定版项目</div>
                ) : (
                  Object.entries(finalizedMonths).sort(([a], [b]) => {
                    // 按年月倒序排列（最新的在前）
                    const dateA = new Date(a.replace('年', '-').replace('月', ''));
                    const dateB = new Date(b.replace('年', '-').replace('月', ''));
                    return dateB.getTime() - dateA.getTime();
                  }).map(([month, monthProjects]) => (
                    <div key={month} className="mb-6">
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1.5 z-10 border-b ${theme.border.primary}`}>
                        <Calendar className="w-3 h-3" />
                        {month}
                        <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthProjects.length}</span>
                      </div>
                      <div className="space-y-0.5">
                        {/* 月份内按序号和创建时间排序 */}
                        {sortProjectsByMonthAndCreatedDate(monthProjects).map(p => renderProjectItem(p, null))}
                      </div>
                    </div>
                  ))
                )}
            </div>
        </div>
    );
  };

  const renderGroupTree = (sourceProjects: Project[]) => {
    // Group projects by category
    const groups = sourceProjects.reduce((acc, project) => {
        const g = project.group || '未分类';
        if (!acc[g]) acc[g] = [];
        acc[g].push(project);
        return acc;
    }, {} as Record<string, Project[]>);

    return (
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {Object.keys(groups).length === 0 && (
                <div className="text-xs text-zinc-600 italic px-2">未找到项目</div>
            )}
            {Object.entries(groups).map(([groupName, groupProjects]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                return (
                    <div key={groupName} className="mb-3">
                        <div 
                            onClick={() => toggleGroupCollapse(groupName)}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-1 sticky top-0 py-2 px-2 -mx-2 z-10 cursor-pointer select-none rounded-md transition-all duration-200 ${
                                isCollapsed 
                                    ? 'text-zinc-500 bg-zinc-950 hover:bg-zinc-900 hover:text-zinc-300' 
                                    : 'text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800/50'
                            }`}
                        >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                            <Folder className={`w-3.5 h-3.5 transition-colors duration-200 ${isCollapsed ? 'text-zinc-500' : 'text-indigo-400'}`} />
                            <span className="flex-1">{groupName}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] transition-colors duration-200 ${
                                isCollapsed 
                                    ? 'bg-zinc-800 text-zinc-500' 
                                    : 'bg-indigo-500/20 text-indigo-400'
                            }`}>{groupProjects.length}</span>
                        </div>
                        <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                            <div className="space-y-0.5 pl-2 pt-1">
                                {/* 分组内排序：进行中项目在前，然后按月份序号和创建时间排序 */}
                                {sortProjectsForGroupView(groupProjects).map(p => renderProjectItem(p, null))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  // 2. DELIVERY
  const renderDeliveryTree = () => {
    const pending = filteredProjects.filter(p => p.status === 'finalized');
    const delivered = filteredProjects.filter(p => p.status === 'delivered');

    // 按月份分组待交付项目
    const pendingMonths: Record<string, Project[]> = {};
    pending.forEach(p => {
      const date = new Date(p.createdDate);
      const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
      if (!pendingMonths[key]) pendingMonths[key] = [];
      pendingMonths[key].push(p);
    });

    // 按月份分组已交付项目
    const deliveredMonths: Record<string, Project[]> = {};
    delivered.forEach(p => {
      const date = new Date(p.createdDate);
      const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
      if (!deliveredMonths[key]) deliveredMonths[key] = [];
      deliveredMonths[key].push(p);
    });

    return (
        <div ref={containerRef} className="flex-1 flex flex-col min-h-0 relative">
             <div style={{ height: `${splitRatio}%` }} className="overflow-y-auto p-3 custom-scrollbar">
                <div className={`text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    待交付
                </div>
                {Object.keys(pendingMonths).length === 0 ? (
                  <div className={`text-xs ${theme.text.muted} italic px-2`}>无待办事项</div>
                ) : (
                  Object.entries(pendingMonths).sort(([a], [b]) => {
                    // 按年月倒序排列（最新的在前）
                    const dateA = new Date(a.replace('年', '-').replace('月', ''));
                    const dateB = new Date(b.replace('年', '-').replace('月', ''));
                    return dateB.getTime() - dateA.getTime();
                  }).map(([month, monthProjects]) => (
                    <div key={month} className="mb-6">
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1.5 z-10 border-b ${theme.border.primary}`}>
                        <Calendar className="w-3 h-3" />
                        {month}
                        <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthProjects.length}</span>
                      </div>
                      <div className="space-y-0.5">
                        {/* 月份内按序号和创建时间排序 */}
                        {sortProjectsByMonthAndCreatedDate(monthProjects).map(p => renderProjectItem(p, <Archive className="w-3.5 h-3.5" />))}
                      </div>
                    </div>
                  ))
                )}
            </div>
            
            <div 
                onMouseDown={handleMouseDown}
                className={`h-1 ${theme.bg.tertiary} border-y ${theme.border.primary} cursor-row-resize hover:bg-indigo-500/20 flex justify-center items-center group shrink-0 z-10`}
            >
                <div className={`w-8 h-1 ${theme.bg.secondary} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            </div>

            <div className={`flex-1 overflow-y-auto border-t ${theme.border.primary} ${theme.bg.secondary} p-3`}>
                <div className={`text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 flex items-center gap-2`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    已交付归档
                </div>
                {Object.keys(deliveredMonths).length === 0 ? (
                  <div className={`text-xs ${theme.text.muted} italic px-2`}>无已交付项目</div>
                ) : (
                  Object.entries(deliveredMonths).sort(([a], [b]) => {
                    // 按年月倒序排列（最新的在前）
                    const dateA = new Date(a.replace('年', '-').replace('月', ''));
                    const dateB = new Date(b.replace('年', '-').replace('月', ''));
                    return dateB.getTime() - dateA.getTime();
                  }).map(([month, monthProjects]) => (
                    <div key={month} className="mb-6">
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1.5 z-10 border-b ${theme.border.primary}`}>
                        <Calendar className="w-3 h-3" />
                        {month}
                        <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthProjects.length}</span>
                      </div>
                      <div className="space-y-0.5">
                        {/* 月份内按序号和创建时间排序 */}
                        {sortProjectsByMonthAndCreatedDate(monthProjects).map(p => renderProjectItem(p, <Check className="w-3.5 h-3.5 text-emerald-500" />))}
                      </div>
                    </div>
                  ))
                )}
            </div>
        </div>
    );
  };

  const renderDeliveryGroupTree = () => {
      const deliveryProjects = filteredProjects.filter(p => p.status === 'finalized' || p.status === 'delivered');
      return renderGroupTree(deliveryProjects);
  };

  // 4. SHARE
  const renderShareMonthTree = () => {
    // 按月份分组所有项目
    const months: Record<string, Project[]> = {};
    filteredProjects.forEach(p => {
      const date = new Date(p.createdDate);
      const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
      if (!months[key]) months[key] = [];
      months[key].push(p);
    });

    return (
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {Object.keys(months).length === 0 ? (
          <div className={`text-xs ${theme.text.muted} italic px-2`}>未找到项目</div>
        ) : (
          Object.entries(months).sort(([a], [b]) => {
            const dateA = new Date(a.replace('年', '-').replace('月', ''));
            const dateB = new Date(b.replace('年', '-').replace('月', ''));
            return dateB.getTime() - dateA.getTime();
          }).map(([month, monthProjects]) => (
            <div key={month} className="mb-6">
              <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1.5 z-10 border-b ${theme.border.primary}`}>
                <Calendar className="w-3 h-3" />
                {month}
                <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthProjects.length}</span>
              </div>
              <div className="space-y-0.5">
                {/* 月份内按序号和创建时间排序 */}
                {sortProjectsByMonthAndCreatedDate(monthProjects).map(p => renderProjectItem(p, null))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderShareGroupTree = () => {
    return renderGroupTree(filteredProjects);
  };

  // 3. SHOWCASE
  const renderShowcaseGroupTree = () => {
      let caseVideos = state.videos.filter(v => v.isCaseFile);
      
      // 根据系统标签筛选案例文件
      const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
        ? selectedGroupTags 
        : selectedGroupTag 
          ? [selectedGroupTag] 
          : [];
      
      if (tagsToFilter.length > 0) {
          caseVideos = caseVideos.filter(v => {
              // Check if video has any of the selected tags (OR logic)
              return tagsToFilter.some(tagName => {
                  const tag = tags.find(t => t.name === tagName);
                  return v.tags?.includes(tagName) || (tag && v.tagIds?.includes(tag.id));
              });
          });
      }

      return (
        <div className="flex-1 flex flex-col min-h-0">

          {/* 标签筛选结果列表，可一键添加到浏览区 */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
            {caseVideos.length === 0 ? (
              <div className="text-xs text-zinc-600 italic px-2 py-4">未找到匹配的案例文件</div>
            ) : (
              caseVideos.map(v => {
                const matchedTags = getMatchedTagsForVideo(v);
                return (
                  <div 
                    key={v.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-zinc-900 group"
                  >
                    <div 
                      onClick={() => dispatch({ type: 'SELECT_VIDEO', payload: v.id })}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* 预览画面 */}
                      <div className="w-16 h-10 bg-zinc-800 rounded overflow-hidden shrink-0 relative">
                        <img 
                          src={v.thumbnailUrl || `https://picsum.photos/seed/${v.id}/160/100`} 
                          alt={v.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://picsum.photos/seed/${v.id}/160/100`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm text-zinc-400 hover:text-zinc-200 truncate">
                          <HighlightText text={v.name} highlight={searchTerm} />
                        </span>
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
                  <button
                    onClick={() => dispatch({ type: 'ADD_TO_SHOWCASE_BROWSER', payload: v.id })}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-all"
                  >
                    <PlusCircle className="w-3 h-3" />
                  </button>
                </div>
                );
              })
            )}
            {caseVideos.length > 0 && (
              <button
                onClick={() => dispatch({ type: 'SET_FILTERED_SHOWCASE_VIDEOS', payload: caseVideos.map(v => v.id) })}
                className="w-full mt-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
              >
                一键添加全部 ({caseVideos.length})
              </button>
            )}
          </div>
        </div>
      );
  };

  const renderShowcaseMonthTree = () => {
      let caseVideos = videos.filter(v => v.isCaseFile);
      
      // 根据系统标签筛选案例文件
      const tagsToFilter = isTagMultiSelectMode && selectedGroupTags.length > 0 
        ? selectedGroupTags 
        : selectedGroupTag 
          ? [selectedGroupTag] 
          : [];
      
      if (tagsToFilter.length > 0) {
          caseVideos = caseVideos.filter(v => {
              // Check if video has any of the selected tags (OR logic)
              return tagsToFilter.some(tagName => {
                  const tag = tags.find(t => t.name === tagName);
                  return v.tags?.includes(tagName) || (tag && v.tagIds?.includes(tag.id));
              });
          });
      }
      
      // 根据搜索关键词过滤案例文件
      if (searchTerm.trim()) {
          caseVideos = caseVideos.filter(v => 
              v.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
      }
      
      // 简单按创建时间月份分组（如果缺省则分到“未分组”）
      const months: Record<string, typeof caseVideos> = {};
      caseVideos.forEach(v => {
          const proj = state.projects.find(p => p.id === v.projectId);
          const date = proj ? new Date(proj.createdDate) : new Date();
          const key = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
          if (!months[key]) months[key] = [];
          months[key].push(v);
      });

      if (Object.keys(months).length === 0) {
          months['未分组'] = [];
      }

      return (
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {Object.entries(months).map(([month, monthVideos]) => (
                  <div key={month} className="mb-6">
                      <div className={`flex items-center gap-2 text-[10px] font-bold ${theme.text.muted} uppercase tracking-wider mb-2 sticky top-0 ${theme.bg.primary} py-1 z-10`}>
                          <Calendar className="w-3 h-3" />
                          {month}
                          <span className={`ml-auto ${theme.bg.secondary} ${theme.text.muted} px-1.5 rounded-full text-[9px]`}>{monthVideos.length}</span>
                      </div>
                      <div className="space-y-0.5">
                          {monthVideos.map(v => {
                            const matchedTags = getMatchedTagsForVideo(v);
                            return (
                              <div 
                                key={v.id} 
                                className={`flex items-center justify-between p-2 rounded ${theme.bg.hover} group`}
                              >
                                  <div 
                                    onClick={() => dispatch({ type: 'SELECT_VIDEO', payload: v.id })}
                                    className={`flex items-center gap-3 flex-1 min-w-0 cursor-pointer ${theme.text.muted} ${theme.text.hover} transition-colors`}
                                  >
                                      {/* 预览画面 */}
                                      <div className="w-16 h-10 bg-zinc-800 rounded overflow-hidden shrink-0 relative">
                                        <img 
                                          src={v.thumbnailUrl || `https://picsum.photos/seed/${v.id}/160/100`} 
                                          alt={v.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = `https://picsum.photos/seed/${v.id}/160/100`;
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <PlayCircle className="w-4 h-4 text-white" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                        <span className="text-sm truncate">
                                            <HighlightText text={v.name} highlight={searchTerm} />
                                        </span>
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
                                  <button
                                    onClick={() => dispatch({ type: 'ADD_TO_SHOWCASE_BROWSER', payload: v.id })}
                                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-all"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                  </button>
                              </div>
                            );
                          })}
                      </div>
                  </div>
              ))}
              {caseVideos.length === 0 && (
                  <div className={`text-xs ${theme.text.muted} italic p-2`}>
                      {searchTerm.trim() ? '未找到匹配的案例视频。' : '未标记案例视频。'}
                  </div>
              )}
          </div>
      );
  };

  // 渲染设置模块的二级菜单
  const renderSettingsMenu = () => {
    const menuItems = [
      { id: 'teams', label: '团队管理', icon: Shield },
      { id: 'groups', label: '项目分组', icon: FolderOpen },
      { id: 'projects', label: '项目', icon: FileVideo },
      { id: 'tags', label: '标签', icon: Tag },
    ];

    return (
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = settingsActiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => dispatch({ type: 'SET_SETTINGS_TAB', payload: item.id as 'teams' | 'groups' | 'projects' | 'tags' })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : `${theme.text.muted} ${theme.bg.hover} ${theme.text.hover}`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 根据模块设置不同的宽度
  const panelWidth = activeModule === 'settings' ? 'w-[180px]' : 'w-[320px]';
  
  return (
    <>
        <aside className={`fixed left-[64px] top-14 bottom-0 ${panelWidth} ${theme.bg.secondary} border-r ${theme.border.primary} z-30 flex flex-col transition-transform duration-300 ease-in-out ${
          isRetrievalPanelVisible ? 'translate-x-0' : '-translate-x-full'
        }`}>
        
        {/* Header */}
        <div className={`h-14 flex items-center justify-between px-4 border-b ${theme.border.primary} shrink-0`}>
            <span className={`text-sm font-semibold ${theme.text.secondary}`}>
                {activeModule === 'review' && '快速检索'}
                {activeModule === 'delivery' && '交付中心'}
                {activeModule === 'showcase' && '案例遴选'}
                {activeModule === 'share' && '项目选择'}
                {activeModule === 'settings' && '系统设置'}
            </span>
            <div className="flex items-center gap-2">
                {/* 隐藏按钮 - 设置模块不显示 */}
                {activeModule !== 'settings' && (
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_RETRIEVAL_PANEL' })}
                    className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${theme.text.muted} hover:text-zinc-200`}
                    title="隐藏面板"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                )}
                {/* 视图切换按钮 - 设置模块不显示 */}
                {activeModule !== 'settings' && (
                <div className={`flex items-center gap-1 rounded-lg p-1 ${theme.bg.secondary} border ${theme.border.primary}`}>
                    <button 
                        onClick={() => setViewMode('month')}
                        className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                            viewMode === 'month' 
                                ? `${theme.text.indigo} bg-indigo-500/20` 
                                : `${theme.text.disabled} ${theme.text.hover}`
                        }`}
                        title="月份视图"
                    >
                        <Calendar className={`w-4 h-4 ${viewMode === 'month' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
                        月份
                    </button>
                    <button 
                        onClick={() => setViewMode('group')}
                        className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium ${
                            viewMode === 'group' 
                                ? `${theme.text.indigo} bg-indigo-500/20` 
                                : `${theme.text.disabled} ${theme.text.hover}`
                        }`}
                        title="分组视图"
                    >
                        <LayoutGrid className={`w-4 h-4 ${viewMode === 'group' ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : ''}`} />
                        分组
                    </button>
                </div>
                )}
                
                {/* New Project Button - Prominent */}
                {activeModule === 'review' && (
                    <button 
                        onClick={handleOpenCreateModal}
                        className="ml-1 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-sm shadow-indigo-900/20 transition-all hover:scale-105"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
                {/* Clear Selection Button - Share Module */}
                {activeModule === 'share' && shareMultiSelectMode && selectedShareProjects.length > 0 && (
                    <button 
                        onClick={() => dispatch({ type: 'CLEAR_SHARE_PROJECTS' })}
                        className="ml-1 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                        title="清空选择"
                    >
                        清空
                    </button>
                )}
                {activeModule === 'share' && !shareMultiSelectMode && selectedShareProjectId && (
                    <button 
                        onClick={() => dispatch({ type: 'SELECT_SHARE_PROJECT', payload: null })}
                        className="ml-1 px-2 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                        title="取消选择"
                    >
                        取消
                    </button>
                )}
            </div>
        </div>

        {/* Search Input - 设置模块不显示搜索框 */}
        {activeModule !== 'settings' && (
        <div className="border-b border-zinc-800 shrink-0">
            <div className="p-3">
                <div className="flex items-center gap-2">
                    <div className="relative group flex-1">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                        <input 
                            type="text" 
                            placeholder={activeModule === 'showcase' ? "搜索案例视频..." : activeModule === 'share' ? "搜索项目名称或客户..." : "筛选项目..."}
                            value={searchTerm}
                            onChange={(e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
                            className={`w-full ${theme.bg.secondary} border ${theme.border.primary} rounded-lg pl-9 pr-3 py-2 text-sm ${theme.text.secondary} placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all`}
                        />
                    </div>
                    {/* 多选按钮 - 仅在分享模块显示 */}
                    {activeModule === 'share' && (
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_SHARE_MULTI_SELECT_MODE' })}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 border shrink-0 ${
                                shareMultiSelectMode
                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30'
                                    : `${theme.bg.secondary} ${theme.text.disabled} ${theme.border.primary} ${theme.text.hover}`
                            }`}
                            title={shareMultiSelectMode ? '关闭多选模式' : '启用多选模式'}
                        >
                            {shareMultiSelectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                    )}
                    {/* 标签按钮 - 在审阅、交付、案例模块显示 */}
                    {(activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase') && (
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_TAG_PANEL' })}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 border shrink-0 ${
                                isTagPanelExpanded || selectedGroupTag || (selectedGroupTags.length > 0)
                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30'
                                    : `${theme.bg.secondary} ${theme.text.disabled} ${theme.border.primary} ${theme.text.hover}`
                            }`}
                            title={isTagPanelExpanded ? '收起标签' : '展开标签'}
                        >
                            <Tag className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {/* 标签面板 - 在审阅、交付、案例模块显示 */}
            {isTagPanelExpanded && (activeModule === 'review' || activeModule === 'delivery' || activeModule === 'showcase') && (
                <div className="px-3 pb-3 border-t border-zinc-800">
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            onClick={() => dispatch({ type: 'SET_GROUP_TAG', payload: null })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                !selectedGroupTag
                                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                    : `${theme.bg.secondary} ${theme.text.disabled} ${theme.border.primary} ${theme.text.hover}`
                            }`}
                        >
                            全部
                        </button>
                        {systemTags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => dispatch({ type: 'SET_GROUP_TAG', payload: tag.name })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    selectedGroupTag === tag.name
                                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                        : `${theme.bg.secondary} ${theme.text.disabled} ${theme.border.primary} ${theme.text.hover}`
                                }`}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        )}

        {/* Content Switching Logic */}
        {activeModule === 'review' && (viewMode === 'month' ? renderReviewTree() : renderGroupTree(filteredProjects))}
        
        {activeModule === 'delivery' && (viewMode === 'month' ? renderDeliveryTree() : renderDeliveryGroupTree())}
        
        {activeModule === 'showcase' && (viewMode === 'group' ? renderShowcaseGroupTree() : renderShowcaseMonthTree())}
        
        {activeModule === 'share' && (viewMode === 'month' ? renderShareMonthTree() : renderShareGroupTree())}
        
        {activeModule === 'settings' && renderSettingsMenu()}

        </aside>

        {/* UNLOCK / JUSTIFICATION MODAL */}
        {unlockModal.isOpen && (
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-orange-500/30 w-full max-w-sm rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                     <div className="px-5 py-4 bg-orange-500/10 border-b border-orange-500/20 rounded-t-xl flex items-center gap-3">
                         <div className="p-2 bg-orange-500/20 rounded-full text-orange-500">
                             <Lock className="w-5 h-5" />
                         </div>
                         <div>
                             <h3 className="font-semibold text-orange-200">项目已定版锁定</h3>
                             <p className="text-xs text-orange-300/70">该项目处于定版状态，编辑受限。</p>
                         </div>
                     </div>
                     <div className="p-6 space-y-4">
                         <p className="text-sm text-zinc-300">
                            为了保证交付内容的一致性，修改已定版项目的设置需要填写修改说明。
                         </p>
                         <div>
                             <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">修改 / 解锁说明</label>
                             <textarea 
                                autoFocus
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:border-orange-500 outline-none resize-none h-24 placeholder-zinc-600"
                                placeholder="请说明为什么需要修改项目信息..."
                                value={unlockModal.justification}
                                onChange={(e) => setUnlockModal({...unlockModal, justification: e.target.value})}
                             />
                         </div>
                     </div>
                     <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950 rounded-b-xl">
                        <button 
                            onClick={() => setUnlockModal({...unlockModal, isOpen: false})}
                            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                        >
                            取消
                        </button>
                        <button 
                            disabled={!unlockModal.justification.trim()}
                            onClick={handleConfirmUnlock}
                            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
                        >
                            解锁并编辑
                        </button>
                     </div>
                </div>
            </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {modalConfig.isOpen && (
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({...modalConfig, isOpen: false})}
                title={modalConfig.mode === 'create' ? '新建项目' : '编辑项目设置'}
                maxWidth="md"
                footer={
                    <>
                        <button 
                            onClick={() => setModalConfig({...modalConfig, isOpen: false})}
                            className={`px-4 py-2 text-sm ${theme.text.muted} ${theme.text.hoverPrimary} ${theme.bg.hover} rounded-lg transition-colors`}
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleConfirmModal}
                            disabled={isCreatingProject || isUpdatingProject}
                            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {(isCreatingProject || isUpdatingProject) ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{modalConfig.mode === 'create' ? '创建中...' : '保存中...'}</span>
                                </>
                            ) : (
                                <span>{modalConfig.mode === 'create' ? '创建项目' : '保存更改'}</span>
                            )}
                        </button>
                    </>
                }
            >
                    
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>项目名称 (YYMM_...)</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                disabled={isCreatingProject || isUpdatingProject}
                                className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2.5 ${theme.text.primary} focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                        </div>

                        {/* Leads Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>项目负责人</label>
                                <div className="relative">
                                    <User className={`absolute left-2.5 top-2.5 w-4 h-4 ${theme.text.disabled}`} />
                                    <input 
                                        type="text" 
                                        placeholder="姓名"
                                        value={formData.lead}
                                        onChange={(e) => setFormData({...formData, lead: e.target.value})}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg pl-9 pr-3 py-2 text-sm ${theme.text.primary} focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>后期负责人</label>
                                <div className="relative">
                                    <Users className={`absolute left-2.5 top-2.5 w-4 h-4 ${theme.text.disabled}`} />
                                    <input 
                                        type="text" 
                                        placeholder="姓名"
                                        value={formData.postLead}
                                        onChange={(e) => setFormData({...formData, postLead: e.target.value})}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg pl-9 pr-3 py-2 text-sm ${theme.text.primary} focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Client */}
                        <div>
                            <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>客户名称</label>
                            <input 
                                type="text" 
                                placeholder="例如：Nike、Apple..."
                                value={formData.client}
                                onChange={(e) => setFormData({...formData, client: e.target.value})}
                                disabled={isCreatingProject || isUpdatingProject}
                                className={`w-full ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                        </div>

                        {/* Group Selection */}
                        <div>
                            <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>所属组别 / 分类</label>
                            {formData.isNewGroup ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="输入新组名..."
                                        value={formData.group}
                                        onChange={(e) => setFormData({...formData, group: e.target.value})}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className={`flex-1 ${theme.bg.primary} border border-indigo-500 rounded-lg px-3 py-2 text-sm ${theme.text.primary} outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                    />
                                    <button 
                                        onClick={() => {
                                            const newGroupName = formData.group.trim();
                                            if (!newGroupName) {
                                                alert('请输入分组名称');
                                                return;
                                            }
                                            if (existingGroups.includes(newGroupName)) {
                                                alert('该分组名称已存在');
                                                return;
                                            }
                                            // 保存到预设分组
                                            const currentPresets = getPresetGroups();
                                            if (!currentPresets.includes(newGroupName)) {
                                                localStorage.setItem('preset_project_groups', JSON.stringify([...currentPresets, newGroupName]));
                                            }
                                            // 切换回下拉模式并选中新分组
                                            setFormData({...formData, isNewGroup: false, group: newGroupName});
                                        }}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        确认
                                    </button>
                                    <button 
                                        onClick={() => setFormData({...formData, isNewGroup: false, group: existingGroups[0] || '未分类'})}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className={`px-3 py-2 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.tertiary} rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select 
                                        value={formData.group}
                                        onChange={(e) => {
                                            if (e.target.value === '__NEW__') {
                                                setFormData({...formData, isNewGroup: true, group: ''});
                                            } else {
                                                setFormData({...formData, group: e.target.value});
                                            }
                                        }}
                                        disabled={isCreatingProject || isUpdatingProject}
                                        className={`w-full appearance-none ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <option value="Uncategorized">无组别</option>
                                        {existingGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                        <option disabled>──────────</option>
                                        <option value="__NEW__">+ 新建组别</option>
                                    </select>
                                    <ChevronDown className={`absolute right-3 top-2.5 w-4 h-4 ${theme.text.muted} pointer-events-none`} />
                                </div>
                            )}
                        </div>

                        {/* Team Members */}
                        <div>
                            <label className={`block text-xs font-medium ${theme.text.muted} mb-1.5 uppercase`}>团队成员</label>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    placeholder="添加成员姓名..."
                                    value={formData.newMemberInput}
                                    onChange={(e) => setFormData({...formData, newMemberInput: e.target.value})}
                                    onKeyDown={(e) => e.key === 'Enter' && !isCreatingProject && !isUpdatingProject && handleAddTeamMember()}
                                    disabled={isCreatingProject || isUpdatingProject}
                                    className={`flex-1 ${theme.bg.primary} border ${theme.border.secondary} rounded-lg px-3 py-2 text-sm ${theme.text.primary} focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                                />
                                <button 
                                    onClick={handleAddTeamMember}
                                    disabled={isCreatingProject || isUpdatingProject}
                                    className={`px-3 ${theme.bg.tertiary} ${theme.bg.hover} ${theme.text.tertiary} rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    添加
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.team.map((member, idx) => (
                                    <span key={idx} className={`${theme.bg.tertiary} border ${theme.border.secondary} ${theme.text.secondary} text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
                                        {member}
                                        <button onClick={() => handleRemoveTeamMember(member)} className={`${theme.text.muted} hover:text-red-400`}>
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                {formData.team.length === 0 && <span className={`text-xs ${theme.text.disabled} italic`}>暂无成员</span>}
                            </div>
                        </div>
                    </div>
            </Modal>
        )}
        
        {/* 显示按钮 - 当面板隐藏时显示 */}
        {!isRetrievalPanelVisible && (
            <button
                onClick={() => dispatch({ type: 'TOGGLE_RETRIEVAL_PANEL' })}
                className={`fixed left-[64px] top-1/2 -translate-y-1/2 z-30 p-2 ${theme.bg.secondary} ${theme.border.primary} border-r border-t border-b rounded-r-lg shadow-lg transition-all hover:bg-zinc-800 ${theme.text.secondary} hover:text-zinc-100`}
                title="显示面板"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        )}
    </>
  );
};
