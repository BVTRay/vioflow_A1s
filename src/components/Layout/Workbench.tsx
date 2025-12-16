
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, X, Share, PlaySquare, FileCheck, ShieldAlert, MonitorPlay, GripVertical, FileVideo, AlertCircle, GitBranch, PlusSquare, History, ArrowRight, Upload, FileText, Copyright, Film, Tag, CheckCircle, Link2, Package, Download, Power, User, Users, ChevronDown, Settings, FolderOpen, Trash2, Edit2, Save, Loader2, List, LayoutGrid } from 'lucide-react';
import { useStore } from '../../App';
import { Video, DeliveryData, Project } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { projectsApi } from '../../api/projects';
import { tagsApi } from '../../api/tags';
import { usersApi } from '../../api/users';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface WorkbenchProps {
  visible: boolean;
}

export const Workbench: React.FC<WorkbenchProps> = ({ visible }) => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { activeModule, selectedProjectId, selectedVideoId, projects, deliveries, cart, videos, workbenchActionType, tags, workbenchEditProjectId, showVersionHistory, versionHistoryViewMode, versionHistoryBaseName, quickUploadMode, workbenchView, workbenchContext, workbenchCreateMode } = state;
  const project = projects.find(p => p.id === selectedProjectId);
  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const lockedVideo = selectedVideo || (selectedVideoId ? videos.find(v => v.id === selectedVideoId) : undefined);
  const delivery = deliveries.find(d => d.projectId === selectedProjectId);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Settings state
  const [settingsActiveTab, setSettingsActiveTab] = useState<'groups' | 'projects' | 'tags' | 'team'>('groups');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  // Upload Configuration Modal State
  const [uploadConfig, setUploadConfig] = useState<{
      isOpen: boolean;
      file: File | null;
      uploadMode: 'new' | 'addVersion'; // 上传新视频 or 添加新版本
      selectedExistingVideoId?: string; // 添加新版本时选中的既有视频ID
      nextVersion: number;
      changeLog: string;
      videoDescription?: string; // 上传新视频时的视频说明
  }>({
      isOpen: false,
      file: null,
      uploadMode: 'new',
      nextVersion: 1,
      changeLog: '',
      videoDescription: ''
  });

  // Custom tag input state (for delivery module)
  const [newTagInput, setNewTagInput] = useState('');

  // New Project Form State
  const [projectFormData, setProjectFormData] = useState({ 
    name: '', 
    client: '', 
    lead: '',
    postLead: '',
    group: '',
    isNewGroup: false,
    team: [] as string[],
    newMemberInput: ''
  });

  // Edit Project Form State
  const [editProjectFormData, setEditProjectFormData] = useState({ 
    name: '', 
    client: '', 
    lead: '',
    postLead: '',
    group: '',
    isNewGroup: false,
    team: [] as string[],
    newMemberInput: ''
  });
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);

  // 统一确定当前操作台视图
  const computedWorkbenchView: 'newProject' | 'projectSettings' | 'upload' | 'versionHistory' = (() => {
    if (workbenchView && workbenchView !== 'none') return workbenchView;
    if (showVersionHistory) return 'versionHistory';
    if (workbenchEditProjectId) return 'projectSettings';
    if (workbenchCreateMode === 'project') return 'newProject';
    return 'upload';
  })();

  // 初始化编辑表单数据
  useEffect(() => {
    if (workbenchEditProjectId && project && workbenchEditProjectId === project.id) {
      setEditProjectFormData({
        name: project.name,
        client: project.client || '',
        lead: project.lead || '',
        postLead: project.postLead || '',
        group: project.group || '未分类',
        isNewGroup: false,
        team: project.team || [],
        newMemberInput: ''
      });
    }
  }, [workbenchEditProjectId, project]);

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFileSelection(e.dataTransfer.files[0]);
      }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          processFileSelection(e.target.files[0]);
      }
  };

  const processFileSelection = (file: File) => {
      // 情况1：为某个视频上传新版本（selectedVideo/lockedVideo存在）
      if (lockedVideo && project) {
          const baseName = lockedVideo.baseName || lockedVideo.name.replace(/^v\d+_/, '');
          const seriesVideos = videos.filter(v => 
              v.projectId === project.id && 
              (v.baseName === baseName || v.name.replace(/^v\d+_/, '') === baseName)
          );
          const maxVersion = Math.max(0, ...seriesVideos.map(v => v.version));
          const nextVersion = maxVersion + 1;

          // 为视频上传新版本时，不打开模态框，直接在操作台显示
          setUploadConfig({
              isOpen: false, // 不打开模态框
              file: file,
              uploadMode: 'addVersion',
              selectedExistingVideoId: lockedVideo.id,
              nextVersion: nextVersion,
              changeLog: '',
              videoDescription: ''
          });
          return;
      }

      // 情况2：为某个项目上传视频（project存在但没有selectedVideo）
      if (project && !lockedVideo) {
          // 为项目上传视频时，不打开模态框，直接在操作台显示
          setUploadConfig({
              isOpen: false, // 不打开模态框，所有操作在操作台内完成
              file: file,
              uploadMode: 'new', // 默认选择"上传新视频"
              nextVersion: 1,
              changeLog: '',
              videoDescription: ''
          });
          return;
      }

      // 情况3：快速上传模式（需要先选择项目）
      if (state.quickUploadMode && !project) {
          // 在快速上传模式下，如果没有选中项目，先提示选择项目
          alert('请先选择项目');
          return;
      }
  };

  const startUpload = async () => {
      if (!uploadConfig.file || !project) return;

      // 验证必填项
      if (uploadConfig.uploadMode === 'addVersion') {
          // 为视频上传新版本时，必须要有selectedExistingVideoId
          if (!uploadConfig.selectedExistingVideoId) {
              alert('请选择要添加新版本的既有视频');
              return;
          }
          // 迭代说明是必填的
          if (!uploadConfig.changeLog?.trim()) {
              alert('请填写迭代说明');
              return;
          }
      } else if (uploadConfig.uploadMode === 'new') {
          // 上传新视频时，必须填写视频说明
          if (!uploadConfig.videoDescription?.trim()) {
              alert('请填写视频说明');
              return;
          }
      }

      setUploadConfig(prev => ({ ...prev, isOpen: false }));

      let baseName: string;
      let finalName: string;
      let finalVersion: number;

      if (uploadConfig.uploadMode === 'addVersion') {
          // 添加新版本：使用既有视频的baseName
          const existingVideo = videos.find(v => v.id === uploadConfig.selectedExistingVideoId);
          if (!existingVideo) {
              alert('找不到选中的视频');
              return;
          }
          // 获取既有视频的baseName（去除版本号前缀后的文件名）
          baseName = existingVideo.baseName || existingVideo.name.replace(/^v\d+_/, '');
          // 如果baseName包含扩展名，保留扩展名；否则从上传的文件中获取扩展名
          const hasExtension = baseName.includes('.');
          const fileExtension = hasExtension 
              ? baseName.split('.').pop() 
              : (uploadConfig.file.name.split('.').pop() || 'mp4');
          // 如果baseName包含扩展名，需要先去除扩展名
          if (hasExtension) {
              baseName = baseName.replace(/\.[^/.]+$/, '');
          }
          finalVersion = uploadConfig.nextVersion;
          finalName = `v${finalVersion}_${baseName}.${fileExtension}`;
      } else {
          // 上传新视频：使用文件名（去除版本前缀）作为baseName，并添加版本号
          const originalName = uploadConfig.file.name.replace(/^v\d+_/, ''); // 去除可能存在的版本前缀
          const fileExtension = originalName.split('.').pop() || 'mp4';
          baseName = originalName.replace(/\.[^/.]+$/, ''); // 去除扩展名
          finalVersion = 1;
          finalName = `v1_${baseName}.${fileExtension}`;
      }

      const uploadId = `u_${Date.now()}`;

      try {
          // 导入上传API
          const { uploadApi } = await import('../../api/upload');
          
          // 1. Add to Global Queue
          dispatch({
              type: 'ADD_UPLOAD',
              payload: {
                  id: uploadId,
                  filename: finalName,
                  progress: 0,
                  status: 'uploading',
                  targetProjectName: project.name
              }
          });

          // 2. Open Transfer Drawer to show progress
          dispatch({ type: 'TOGGLE_DRAWER', payload: 'transfer' });

          // 3. 实际上传
          const uploadedVideo = await uploadApi.uploadVideo(
              uploadConfig.file,
              project.id,
              finalName,
              finalVersion,
              baseName,
              uploadConfig.uploadMode === 'addVersion' 
                  ? uploadConfig.changeLog || '上传新版本'
                  : uploadConfig.videoDescription || '上传新视频',
              (progress) => {
                  dispatch({
                      type: 'UPDATE_UPLOAD_PROGRESS',
                      payload: { id: uploadId, progress: Math.floor(progress) }
                  });
              }
          );

          // 4. 上传完成
          dispatch({ type: 'COMPLETE_UPLOAD', payload: uploadId });
          dispatch({
              type: 'ADD_VIDEO',
              payload: {
                  id: uploadedVideo.id,
                  projectId: uploadedVideo.projectId,
                  name: uploadedVideo.name,
                  originalFilename: uploadedVideo.originalFilename,
                  baseName: uploadedVideo.baseName,
                  type: uploadedVideo.type,
                  url: uploadedVideo.url,
                  storageUrl: uploadedVideo.storageUrl,
                  storageKey: uploadedVideo.storageKey,
                  version: uploadedVideo.version,
                  uploadTime: '刚刚',
                  isCaseFile: false,
                  isMainDelivery: false,
                  size: uploadedVideo.size,
                  duration: '00:00:00', // 需要从实际视频获取
                  resolution: '1920x1080', // 需要从实际视频获取
                  status: uploadedVideo.status,
                  changeLog: uploadedVideo.changeLog || (uploadConfig.uploadMode === 'addVersion' ? '上传新版本' : '上传新视频')
              }
          });

          // 5. 发送成功通知
          dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                  id: Date.now().toString(),
                  type: 'success',
                  title: '上传成功',
                  message: `"${finalName}" 已成功上传`,
                  time: '刚刚'
              }
          });

          // 6. 上传完成后关闭操作台（所有入口一致）
          handleClose();
      } catch (error: any) {
          console.error('上传失败:', error);
          dispatch({ type: 'COMPLETE_UPLOAD', payload: uploadId });
          const errorMessage = error?.response?.data?.message || error?.message || '上传失败，请重试';
          dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                  id: Date.now().toString(),
                  type: 'alert',
                  title: '上传失败',
                  message: errorMessage,
                  time: '刚刚'
              }
          });
      }
  };


  const handleClose = () => {
      // 关闭操作台时，统一清空上传配置
      setUploadConfig({
          isOpen: false,
          file: null,
          uploadMode: lockedVideo ? 'addVersion' : 'new',
          nextVersion: 1,
          changeLog: '',
          videoDescription: '',
          selectedExistingVideoId: lockedVideo?.id
      });
      dispatch({ type: 'CLOSE_WORKBENCH' });
      if (activeModule === 'dashboard') {
        dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: null });
      }
  };

  // 打开操作台时（且当前没有已选文件），重置上传表单，避免残留
  useEffect(() => {
    if (visible && !uploadConfig.file) {
      setUploadConfig({
        isOpen: false,
        file: null,
        uploadMode: 'new', // 快速上传后默认上传新视频
        nextVersion: 1,
        changeLog: '',
        videoDescription: '',
        selectedExistingVideoId: undefined
      });
    }
  }, [visible, lockedVideo?.id]); 

  // 初始化新建项目表单数据（当没有选中项目且操作类型为review时）
  useEffect(() => {
    const effectiveModule = activeModule === 'dashboard' ? (workbenchActionType || 'review') : activeModule;
    if (effectiveModule === 'review' && !selectedProjectId && visible) {
      const date = new Date();
      const prefix = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}_`;
      if (!projectFormData.name) {
        setProjectFormData({ 
          name: prefix, 
          client: '', 
          lead: '',
          postLead: '',
          group: '广告片',
          isNewGroup: false,
          team: [],
          newMemberInput: ''
        });
      }
    }
  }, [selectedProjectId, visible, activeModule, workbenchActionType, projectFormData.name]);

  // 当selectedVideo或project变化时，重置上传配置
  useEffect(() => {
    if (lockedVideo) {
      // 当选中视频时，重置上传配置，锁定为"添加新版本"模式
      const baseName = lockedVideo.baseName || lockedVideo.name.replace(/^v\d+_/, '');
      const seriesVideos = videos.filter(v => 
          v.projectId === lockedVideo.projectId && 
          (v.baseName === baseName || v.name.replace(/^v\d+_/, '') === baseName)
      );
      const maxVersion = Math.max(0, ...seriesVideos.map(v => v.version));
      const nextVersion = maxVersion + 1;
      
      setUploadConfig(prev => ({
        ...prev,
        isOpen: false, // 确保不打开模态框
        uploadMode: 'addVersion', // 强制锁定为"添加新版本"
        selectedExistingVideoId: lockedVideo.id, // 强制使用当前视频
        nextVersion: nextVersion,
        // 如果已有文件，保留文件，只更新模式和相关ID
        // 如果没有文件，清空其他字段
        ...(prev.file ? {} : { file: null, changeLog: '', videoDescription: '' })
      }));
    } else if (project && !lockedVideo) {
      // 当为项目上传视频时（非视频卡片进入），重置为"上传新视频"模式
      setUploadConfig(prev => ({
        ...prev,
        isOpen: false,
        uploadMode: 'new',
        nextVersion: 1,
        selectedExistingVideoId: undefined,
        // 如果已有文件，保留文件，只更新模式
        // 如果没有文件，清空其他字段
        ...(prev.file ? {} : { file: null, changeLog: '', videoDescription: '' })
      }));
    }
  }, [lockedVideo?.id, project?.id, videos, lockedVideo?.projectId]);

  // 额外的保护：当selectedVideo存在时，确保uploadMode始终为'addVersion'
  useEffect(() => {
    if (lockedVideo && uploadConfig.uploadMode !== 'addVersion') {
      const baseName = lockedVideo.baseName || lockedVideo.name.replace(/^v\d+_/, '');
      const seriesVideos = videos.filter(v => 
          v.projectId === lockedVideo.projectId && 
          (v.baseName === baseName || v.name.replace(/^v\d+_/, '') === baseName)
      );
      const maxVersion = Math.max(0, ...seriesVideos.map(v => v.version));
      const nextVersion = maxVersion + 1;
      
      setUploadConfig(prev => ({
        ...prev,
        uploadMode: 'addVersion', // 强制锁定
        selectedExistingVideoId: lockedVideo.id, // 强制使用当前视频
        nextVersion: nextVersion
      }));
    }
    // 若项目内没有视频且未锁定到指定视频，强制切回“上传新视频”
    if (!lockedVideo && project) {
      const hasVideos = videos.some(v => v.projectId === project.id);
      if (!hasVideos && uploadConfig.uploadMode === 'addVersion') {
        setUploadConfig(prev => ({
          ...prev,
          uploadMode: 'new',
          selectedExistingVideoId: undefined,
          changeLog: '',
          videoDescription: prev.videoDescription || ''
        }));
      }
    }
  }, [lockedVideo?.id, uploadConfig.uploadMode, videos, lockedVideo?.projectId, project]);

  // 项目选择面板（用于快速上传模式）
  const renderProjectSelector = () => {
      // 按创建时间倒序排列项目（如果没有createdAt则保持原序）
      const recentProjects = [...projects].sort((a, b) => {
          if (a.id && b.id) return parseInt(b.id) - parseInt(a.id); // 假设ID递增
          return 0;
      });

      return (
          <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                  <div>
                      <h2 className="text-sm font-semibold text-zinc-100">选择项目</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">请选择要上传视频的项目</p>
                  </div>
                  <button onClick={handleClose}>
                      <X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
                  {recentProjects.length === 0 ? (
                      <div className="text-center py-12 text-zinc-500">
                          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm">暂无项目</p>
                      </div>
                  ) : (
                      recentProjects.map(p => (
                          <button
                              key={p.id}
                              onClick={() => {
                                  dispatch({ type: 'SELECT_PROJECT', payload: p.id });
                              }}
                              className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all text-left group relative overflow-hidden"
                          >
                              <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors">{p.name}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                      p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                                      p.status === 'finalized' ? 'bg-orange-500/10 text-orange-400' :
                                      'bg-zinc-800 text-zinc-500'
                                  }`}>
                                      {p.status === 'active' ? '进行中' : p.status === 'finalized' ? '已定版' : '已归档'}
                                  </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-zinc-500">
                                  <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {p.client}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                  <span>{p.group || '未分类'}</span>
                              </div>
                          </button>
                      ))
                  )}
              </div>
          </div>
      );
  };

  // 统一的上传视频面板组件
  const renderUploadPanel = () => {
    // 确定当前项目
    const currentProject = project;
    if (!currentProject) return null;

    // 确定是否锁定为"添加新版本"（情况1：从视频卡片进入）
    const isLockedToAddVersion = !!lockedVideo;
    
    // 获取项目下的所有视频（用于"添加新版本"时选择），按 baseName 分组
    const projectVideos = videos.filter(v => v.projectId === currentProject.id);
    const hasProjectVideos = projectVideos.length > 0;
    
    // 按 baseName 分组，只显示每个系列的最新版本
    const videosByBaseName = new Map<string, Video>();
    projectVideos.forEach(v => {
      const baseName = v.baseName || v.name.replace(/^v\d+_/, '');
      const existing = videosByBaseName.get(baseName);
      if (!existing || v.version > existing.version) {
        videosByBaseName.set(baseName, v);
      }
    });
    const latestVersionVideos = Array.from(videosByBaseName.values()).sort((a, b) => 
      new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime()
    );

    // 计算下一个版本号（如果是从视频卡片进入）
    let nextVersion = 1;
    if (lockedVideo) {
        const baseName = lockedVideo.baseName || lockedVideo.name.replace(/^v\d+_/, '');
        const seriesVideos = videos.filter(v => 
            v.projectId === lockedVideo.projectId && 
            (v.baseName === baseName || v.name.replace(/^v\d+_/, '') === baseName)
        );
        const maxVersion = Math.max(0, ...seriesVideos.map(v => v.version));
        nextVersion = maxVersion + 1;
    }

    // 确定标题
    const title = lockedVideo ? '上传新版本' : '上传视频';
    const subtitle = lockedVideo ? lockedVideo.name : currentProject.name;

    return (
        <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">{subtitle}</p>
                </div>
                <button 
                    onClick={() => {
                        if (lockedVideo) {
                            dispatch({ type: 'SELECT_VIDEO', payload: null });
                        }
                        handleClose();
                        // 清空上传配置
                        setUploadConfig({
                            isOpen: false,
                            file: null,
                            uploadMode: isLockedToAddVersion ? 'addVersion' : 'new',
                            nextVersion: 1,
                            changeLog: '',
                            videoDescription: '',
                            selectedExistingVideoId: lockedVideo?.id
                        });
                    }}
                >
                    <X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
                {/* 1. 上传视频的虚线框 - 始终显示 */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="video/*,image/*,audio/*"
                    onChange={handleFileInputChange}
                />
                
                {!uploadConfig.file ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()} 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative overflow-hidden
                            ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700/50 hover:border-indigo-500/50 hover:bg-indigo-500/5'}
                        `}
                    >
                        <UploadCloud className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} />
                        <p className="text-sm text-zinc-300 font-medium">点击或拖放视频文件至此</p>
                        {lockedVideo && (
                            <p className="text-xs text-zinc-500 mt-1">将作为 v{nextVersion} 版本上传</p>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded border border-zinc-800">
                        <FileVideo className="w-8 h-8 text-indigo-500" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-zinc-200 truncate" title={uploadConfig.file.name}>{uploadConfig.file.name}</div>
                            <div className="text-xs text-zinc-500">{(uploadConfig.file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        <button
                            onClick={() => setUploadConfig({
                                ...uploadConfig, 
                                file: null, 
                                changeLog: '', 
                                videoDescription: '',
                                selectedExistingVideoId: lockedVideo?.id
                            })}
                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="重新选择文件"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* 2. 上传类型（上传新视频or添加新版本）*/}
                {/* 从视频卡片进入时（isLockedToAddVersion为true），锁定为"添加新版本"，显示锁定提示 */}
                {isLockedToAddVersion ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-300">已锁定为"添加新版本"模式</span>
                        </div>
                        <p className="text-xs text-indigo-200/70 leading-relaxed">
                            上传的文件将作为 <span className="text-indigo-300 font-medium">{lockedVideo?.name}</span> 的新版本（v{nextVersion}），使用该视频的文件名。
                        </p>
                    </div>
                ) : !hasProjectVideos ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <PlusSquare className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-300">已锁定为"上传新视频"模式</span>
                        </div>
                        <p className="text-xs text-indigo-200/70 leading-relaxed">
                            当前项目暂无视频，只能上传新视频（将自动作为 v1_ 前缀的新文件）。
                        </p>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">上传类型</label>
                        <div className={`grid ${hasProjectVideos ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                            <div 
                                onClick={() => {
                                    setUploadConfig({
                                        ...uploadConfig, 
                                        uploadMode: 'new', 
                                        selectedExistingVideoId: undefined,
                                        changeLog: '',
                                        videoDescription: uploadConfig.videoDescription || ''
                                    });
                                }}
                                className={`cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 text-center transition-all ${
                                    uploadConfig.uploadMode === 'new' 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                }`}
                            >
                                <PlusSquare className="w-5 h-5" />
                                <div>
                                    <div className="text-xs font-bold">上传新视频</div>
                                    <div className="text-[10px] mt-0.5 opacity-80">创建新的视频文件</div>
                                </div>
                            </div>

                            {hasProjectVideos ? (
                                <div 
                                    onClick={() => {
                                        setUploadConfig({
                                            ...uploadConfig, 
                                            uploadMode: 'addVersion',
                                            changeLog: uploadConfig.changeLog || '',
                                            videoDescription: ''
                                        });
                                    }}
                                    className={`cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 text-center transition-all ${
                                        uploadConfig.uploadMode === 'addVersion' 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                    }`}
                                >
                                    <GitBranch className="w-5 h-5" />
                                    <div>
                                        <div className="text-xs font-bold">添加新版本</div>
                                        <div className="text-[10px] mt-0.5 opacity-80">为既有视频添加新版本</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 rounded-lg border border-zinc-800 text-center bg-zinc-950 text-zinc-600">
                                    <GitBranch className="w-5 h-5 mx-auto mb-2 opacity-60" />
                                    <div className="text-xs font-bold">仅可上传新视频</div>
                                    <div className="text-[10px] mt-0.5 opacity-80">当前项目暂无视频，无法添加新版本</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. 选择对应视频（仅在非视频卡片点击进入后"添加新版本"的情况） */}
                {!isLockedToAddVersion && uploadConfig.uploadMode === 'addVersion' && (
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">选择对应视频</label>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 border border-zinc-800 rounded-lg p-2 bg-zinc-950/50">
                            {latestVersionVideos.length === 0 ? (
                                <div className="text-center py-8 text-xs text-zinc-500">
                                    <FileVideo className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p>该项目暂无视频</p>
                                    <p className="text-[10px] mt-1 text-zinc-600">请先选择"上传新视频"</p>
                                </div>
                            ) : (
                                latestVersionVideos.map(v => {
                                    const baseName = v.baseName || v.name.replace(/^v\d+_/, '');
                                    const seriesVideos = videos.filter(v2 => 
                                        v2.projectId === currentProject.id && 
                                        (v2.baseName === baseName || v2.name.replace(/^v\d+_/, '') === baseName)
                                    );
                                    const maxVersion = Math.max(0, ...seriesVideos.map(v2 => v2.version));
                                    const nextVer = maxVersion + 1;
                                    const isSelected = uploadConfig.selectedExistingVideoId === v.id;
                                    
                                    return (
                                        <button
                                            key={v.id}
                                            onClick={() => {
                                                setUploadConfig({
                                                    ...uploadConfig,
                                                    selectedExistingVideoId: v.id,
                                                    nextVersion: nextVer
                                                });
                                            }}
                                            className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                                                isSelected
                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-100 shadow-lg shadow-indigo-500/20'
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-indigo-500/50 hover:bg-zinc-800/50'
                                            }`}
                                        >
                                            <div className="w-16 h-10 bg-zinc-800 rounded overflow-hidden shrink-0">
                                                <img 
                                                    src={v.thumbnailUrl || `https://picsum.photos/seed/${v.id}/160/100`}
                                                    alt={v.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = `https://picsum.photos/seed/${v.id}/160/100`;
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-300'
                                                    }`}>
                                                        v{maxVersion}
                                                    </span>
                                                    <div className="text-xs font-medium truncate">{baseName}</div>
                                                </div>
                                                <div className="text-[10px] opacity-70">
                                                    将作为 <span className="font-bold">v{nextVer}</span> 版本上传
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* 4. 上传说明（新视频说明or迭代说明）*/}
                <div>
                    {isLockedToAddVersion || uploadConfig.uploadMode === 'addVersion' ? (
                        <>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                <span className="text-red-400">*</span> 迭代说明
                            </label>
                            <textarea 
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 focus:border-indigo-500 outline-none resize-none h-24 placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="请简要说明本次视频的修改内容，例如：&#10;· 根据客户反馈调整了开场动画&#10;· 完成了包装特效和调色&#10;· 修改了文案和配音"
                                value={uploadConfig.changeLog}
                                onChange={(e) => setUploadConfig({...uploadConfig, changeLog: e.target.value})}
                                disabled={!uploadConfig.file}
                            />
                        </>
                    ) : (
                        <>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                                <span className="text-red-400">*</span> 新视频说明
                            </label>
                            <textarea 
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 focus:border-indigo-500 outline-none resize-none h-24 placeholder-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="请填写视频说明，例如：&#10;· 项目初稿，等待客户反馈&#10;· 包含完整的片头、片尾和转场效果&#10;· 使用客户提供的素材制作"
                                value={uploadConfig.videoDescription || ''}
                                onChange={(e) => setUploadConfig({...uploadConfig, videoDescription: e.target.value})}
                                disabled={!uploadConfig.file}
                            />
                        </>
                    )}
                    {uploadConfig.file && (
                        <p className="text-[10px] text-zinc-600 mt-1.5">
                            {uploadConfig.uploadMode === 'new' 
                                ? '说明将帮助团队了解这个新视频的内容和用途' 
                                : '说明将帮助团队了解本次迭代的主要改动'
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* 5. 上传按钮 */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-2">
                {uploadConfig.file && (
                    <>
                        <button 
                            onClick={startUpload}
                            disabled={
                                currentProject.status !== 'active' ||
                                (uploadConfig.uploadMode === 'addVersion' && !uploadConfig.selectedExistingVideoId) ||
                                (uploadConfig.uploadMode === 'addVersion' && !uploadConfig.changeLog?.trim()) ||
                                (uploadConfig.uploadMode === 'new' && !uploadConfig.videoDescription?.trim())
                            }
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                        >
                            <UploadCloud className="w-4 h-4" />
                            <span>
                                {uploadConfig.uploadMode === 'addVersion' 
                                    ? `上传为 v${uploadConfig.nextVersion}` 
                                    : '上传新视频'
                                }
                            </span>
                        </button>
                        {/* 提示信息 */}
                        {uploadConfig.uploadMode === 'addVersion' && !uploadConfig.selectedExistingVideoId && (
                            <p className="text-xs text-amber-400 text-center">请先选择对应视频</p>
                        )}
                        {uploadConfig.uploadMode === 'addVersion' && uploadConfig.selectedExistingVideoId && !uploadConfig.changeLog?.trim() && (
                            <p className="text-xs text-amber-400 text-center">请填写迭代说明</p>
                        )}
                        {uploadConfig.uploadMode === 'new' && !uploadConfig.videoDescription?.trim() && (
                            <p className="text-xs text-amber-400 text-center">请填写新视频说明</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
  };

  const renderReviewWorkbench = () => {
    // 如果操作台不可见，不渲染任何内容
    if (!visible) {
      return null;
    }

    const view = computedWorkbenchView;

    // 情况3：快速上传模式且未选择项目 - 显示项目选择器
    if (quickUploadMode && !project) {
        return renderProjectSelector();
    }

    // 如果显示历史版本，优先显示历史版本视图
    if (view === 'versionHistory' && versionHistoryBaseName && selectedProjectId) {
      const historyVersions = videos.filter(v => 
        v.projectId === selectedProjectId && 
        (v.baseName || v.name.replace(/^v\d+_/, '')) === versionHistoryBaseName
      ).sort((a, b) => b.version - a.version); // Sort Descending (Newest first)

      return (
        <div className="flex flex-col h-full">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-start">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">历史版本</h2>
              <p className="text-xs text-zinc-500 mt-1 truncate max-w-[200px]">{versionHistoryBaseName}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* 视图切换按钮 */}
              <div className="flex items-center gap-1 rounded-lg p-1 bg-zinc-800 border border-zinc-700">
                <button 
                  onClick={() => dispatch({ type: 'SET_VERSION_HISTORY_VIEW_MODE', payload: 'grid' })}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    versionHistoryViewMode === 'grid' 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="卡片视图"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => dispatch({ type: 'SET_VERSION_HISTORY_VIEW_MODE', payload: 'list' })}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    versionHistoryViewMode === 'list' 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => dispatch({ type: 'HIDE_VERSION_HISTORY' })}>
                <X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {historyVersions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <FileVideo className="w-12 h-12 mb-4 opacity-20" />
                <p>未找到历史版本</p>
              </div>
            ) : versionHistoryViewMode === 'list' ? (
              // 列表视图
              <div className="space-y-2">
                {historyVersions.map(video => (
                  <div
                    key={video.id}
                    onClick={() => {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                      dispatch({ type: 'HIDE_VERSION_HISTORY' });
                    }}
                    className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="w-24 h-14 bg-zinc-800 rounded overflow-hidden shrink-0 relative">
                      <img 
                        src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/160/100`} 
                        alt={video.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${video.id}/160/100`;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          v{video.version}
                        </span>
                        <h3 className="text-sm font-medium text-zinc-200 truncate">{video.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{video.duration}</span>
                        <span>{video.size}</span>
                        <span>{video.uploadTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 卡片视图
              <div className="grid grid-cols-2 gap-4">
                {historyVersions.map(video => (
                  <div
                    key={video.id}
                    onClick={() => {
                      dispatch({ type: 'SELECT_VIDEO', payload: video.id });
                      dispatch({ type: 'HIDE_VERSION_HISTORY' });
                    }}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all flex flex-col"
                  >
                    <div className="relative aspect-video bg-zinc-800 overflow-hidden">
                      <img 
                        src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/400/225`} 
                        alt={video.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${video.id}/400/225`;
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[10px] font-bold px-1.5 py-0.5 rounded text-zinc-200 border border-white/10">
                        v{video.version}
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-[10px] font-mono px-1.5 py-0.5 rounded text-zinc-200">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col">
                      <h3 className="text-sm font-medium text-zinc-200 truncate mb-1 group-hover:text-indigo-400 transition-colors">
                        {video.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{video.size}</span>
                        <span>{video.uploadTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 情况1：快速上传模式 - 先选择项目
    if (state.quickUploadMode && !project) {
        // 获取近期项目
        const recentProjects = state.recentOpenedProjects
            .map(id => projects.find(p => p.id === id))
            .filter((p): p is Project => p !== undefined && p.status === 'active') // 只显示活跃项目
            .slice(0, 10);
        
        // 如果没有近期项目，获取所有活跃项目，按最后活动时间排序
        const allActiveProjects = recentProjects.length > 0 
            ? recentProjects 
            : projects
                .filter(p => p.status === 'active')
                .sort((a, b) => {
                    const timeA = new Date(a.lastActivityAt || a.createdDate).getTime();
                    const timeB = new Date(b.lastActivityAt || b.createdDate).getTime();
                    return timeB - timeA;
                })
                .slice(0, 10);

        return (
            <div className="flex flex-col h-full">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">快速上传</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">选择近期项目以开始上传</p>
                    </div>
                    <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {allActiveProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                            <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">暂无活跃项目</p>
                            <p className="text-xs mt-2 text-zinc-600">请先创建一个项目</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-xs font-bold text-zinc-500 uppercase mb-3">
                                {recentProjects.length > 0 ? '近期项目' : '所有活跃项目'}
                            </div>
                            <div className="space-y-2">
                                {allActiveProjects.map(p => {
                                    const projectVideos = videos.filter(v => v.projectId === p.id);
                                    const videoCount = projectVideos.length;
                                    
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                dispatch({ type: 'SELECT_PROJECT', payload: p.id });
                                                dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: 'review' });
                                                dispatch({ type: 'SET_QUICK_UPLOAD_MODE', payload: false });
                                                dispatch({
                                                    type: 'OPEN_WORKBENCH_VIEW',
                                                    payload: { view: 'upload', context: { projectId: p.id, from: 'quick-upload' } }
                                                });
                                                dispatch({ type: 'TOGGLE_WORKBENCH', payload: true });
                                            }}
                                            className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-indigo-500/50 hover:bg-zinc-900 transition-all text-left group"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors truncate">
                                                    {p.name}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span className="bg-zinc-800 px-2 py-0.5 rounded">
                                                    {p.group || '未分类'}
                                                </span>
                                                <span>{videoCount} 个视频</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 情况2：项目设置编辑模式
    if (view === 'projectSettings' && project && workbenchEditProjectId === project.id) {
        const existingGroups = Array.from(new Set(projects.map(p => p.group).filter(g => g && g !== '未分类')));

        const handleAddTeamMember = () => {
            if (editProjectFormData.newMemberInput.trim()) {
                setEditProjectFormData({
                    ...editProjectFormData,
                    team: [...editProjectFormData.team, editProjectFormData.newMemberInput.trim()],
                    newMemberInput: ''
                });
            }
        };

        const handleRemoveTeamMember = (member: string) => {
            setEditProjectFormData({
                ...editProjectFormData,
                team: editProjectFormData.team.filter(m => m !== member)
            });
        };

        const handleUpdateProject = async () => {
            if (!editProjectFormData.name.trim() || !project) return;

            setIsUpdatingProject(true);
            try {
                const updatedProject = await projectsApi.update(project.id, {
                    name: editProjectFormData.name,
                    client: editProjectFormData.client,
                    lead: editProjectFormData.lead,
                    postLead: editProjectFormData.postLead,
                    group: editProjectFormData.group
                });

                dispatch({
                    type: 'UPDATE_PROJECT',
                    payload: {
                        ...project,
                        name: updatedProject.name,
                        client: updatedProject.client || editProjectFormData.client,
                        lead: updatedProject.lead || editProjectFormData.lead,
                        postLead: updatedProject.postLead || editProjectFormData.postLead,
                        group: updatedProject.group || editProjectFormData.group,
                        team: editProjectFormData.team
                    }
                });

                // 先关闭操作台，避免中间状态显示上传面板
                dispatch({ type: 'CLOSE_WORKBENCH' });
                // 清除编辑模式（由于操作台已关闭，不会触发渲染）
                dispatch({ type: 'SET_WORKBENCH_EDIT_MODE', payload: null });
            } catch (error) {
                console.error('Failed to update project:', error);
                alert('更新项目设置失败，请重试');
            } finally {
                setIsUpdatingProject(false);
            }
        };

        const handleDeleteProject = async () => {
            if (!project) return;
            setIsDeletingProject(true);
            try {
                await projectsApi.remove(project.id);
                const updatedProjects = projects.filter(p => p.id !== project.id);
                dispatch({ type: 'SET_PROJECTS', payload: updatedProjects });
                if (selectedProjectId === project.id) {
                    dispatch({ type: 'SELECT_PROJECT', payload: null });
                }
                dispatch({ type: 'SET_WORKBENCH_EDIT_MODE', payload: null });
                dispatch({ type: 'CLOSE_WORKBENCH' });
                alert('项目已删除');
            } catch (error) {
                console.error('Failed to delete project:', error);
                alert('删除项目失败，请稍后重试');
            } finally {
                setIsDeletingProject(false);
                setShowDeleteProjectConfirm(false);
            }
        };

        return (
            <>
                {showDeleteProjectConfirm && (
                    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <h3 className="text-sm font-semibold text-zinc-100">确认删除项目</h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteProjectConfirm(false)}
                                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
                                    删除项目后，该项目下的所有文件都会被永久删除，且无法恢复。
                                </div>
                                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200">
                                    项目名称：{project?.name}
                                </div>
                            </div>
                            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowDeleteProjectConfirm(false)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleDeleteProject}
                                    disabled={isDeletingProject}
                                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isDeletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    <span>{isDeletingProject ? '删除中...' : '确认删除'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">项目设置</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">编辑项目信息</p>
                    </div>
                    <button 
                        onClick={() => {
                            // 先关闭操作台，避免中间状态显示上传面板
                            dispatch({ type: 'CLOSE_WORKBENCH' });
                            // 清除编辑模式（由于操作台已关闭，不会触发渲染）
                            dispatch({ type: 'SET_WORKBENCH_EDIT_MODE', payload: null });
                        }}
                    >
                        <X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">项目名称 (YYMM_...)</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={editProjectFormData.name}
                                onChange={(e) => setEditProjectFormData({...editProjectFormData, name: e.target.value})}
                                disabled={isUpdatingProject}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Leads Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">项目负责人</label>
                                <div className="relative">
                                    <User className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="text" 
                                        placeholder="姓名"
                                        value={editProjectFormData.lead}
                                        onChange={(e) => setEditProjectFormData({...editProjectFormData, lead: e.target.value})}
                                        disabled={isUpdatingProject}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">后期负责人</label>
                                <div className="relative">
                                    <Users className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="text" 
                                        placeholder="姓名"
                                        value={editProjectFormData.postLead}
                                        onChange={(e) => setEditProjectFormData({...editProjectFormData, postLead: e.target.value})}
                                        disabled={isUpdatingProject}
                                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Client */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">客户名称</label>
                            <input 
                                type="text" 
                                placeholder="例如：Nike、Apple..."
                                value={editProjectFormData.client}
                                onChange={(e) => setEditProjectFormData({...editProjectFormData, client: e.target.value})}
                                disabled={isUpdatingProject}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Group Selection */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">所属组别 / 分类</label>
                            {editProjectFormData.isNewGroup ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="输入新组名..."
                                        value={editProjectFormData.group}
                                        onChange={(e) => setEditProjectFormData({...editProjectFormData, group: e.target.value})}
                                        disabled={isUpdatingProject}
                                        className="flex-1 bg-zinc-950 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button 
                                        onClick={() => setEditProjectFormData({...editProjectFormData, isNewGroup: false, group: '广告片'})}
                                        disabled={isUpdatingProject}
                                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select 
                                        value={editProjectFormData.group}
                                        onChange={(e) => {
                                            if (e.target.value === '__NEW__') {
                                                setEditProjectFormData({...editProjectFormData, isNewGroup: true, group: ''});
                                            } else {
                                                setEditProjectFormData({...editProjectFormData, group: e.target.value});
                                            }
                                        }}
                                        disabled={isUpdatingProject}
                                        className="w-full appearance-none bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="未分类">未分类</option>
                                        <option value="广告片">广告片</option>
                                        <option value="社交媒体">社交媒体</option>
                                        <option value="长视频">长视频</option>
                                        <option value="纪录片">纪录片</option>
                                        {existingGroups.filter(g => !['广告片', '社交媒体', '长视频', '纪录片', '未分类'].includes(g)).map(g => <option key={g} value={g}>{g}</option>)}
                                        <option disabled>──────────</option>
                                        <option value="__NEW__">+ 新建组别</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                                </div>
                            )}
                        </div>

                        {/* Team Members */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">团队成员</label>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    placeholder="添加成员姓名..."
                                    value={editProjectFormData.newMemberInput}
                                    onChange={(e) => setEditProjectFormData({...editProjectFormData, newMemberInput: e.target.value})}
                                    onKeyDown={(e) => e.key === 'Enter' && !isUpdatingProject && handleAddTeamMember()}
                                    disabled={isUpdatingProject}
                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button 
                                    onClick={handleAddTeamMember}
                                    disabled={isUpdatingProject}
                                    className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    添加
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {editProjectFormData.team.map((member, idx) => (
                                    <span key={idx} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                        {member}
                                        <button 
                                            onClick={() => handleRemoveTeamMember(member)} 
                                            disabled={isUpdatingProject}
                                            className="text-zinc-500 hover:text-red-400 disabled:opacity-50"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                {editProjectFormData.team.length === 0 && <span className="text-xs text-zinc-600 italic">暂无成员</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with Save Button */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-3">
                    <button 
                        onClick={handleUpdateProject}
                        disabled={isUpdatingProject || !editProjectFormData.name.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                    >
                        {isUpdatingProject ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>保存中...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>保存更改</span>
                            </>
                        )}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowDeleteProjectConfirm(true)}
                            className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>删除项目</span>
                        </button>
                    )}
                </div>
            </>
        );
    }

    // 情况3和4：为视频上传新版本 或 为项目上传视频 - 使用统一的上传面板
    if (view === 'upload' && project) {
        return renderUploadPanel();
    }

    // 如果视图是项目设置但项目缺失，给出占位
    if (view === 'projectSettings' && !project) {
      return <EmptyWorkbench message="未找到项目，无法打开项目设置" onClose={handleClose} />;
    }

    // 如果视图是新建项目，或者当前没有项目，则显示新建项目表单
    if (view === 'newProject' || !project) {
      // 初始化表单数据（如果是第一次打开）
      const date = new Date();
      const prefix = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}_`;
      const initialName = projectFormData.name || prefix;
      const initialGroup = projectFormData.group || '广告片';
      
      // 获取现有的组别列表
      const existingGroups = Array.from(new Set(projects.map(p => p.group).filter(g => g && g !== '未分类')));

      const handleAddTeamMember = () => {
        if (projectFormData.newMemberInput.trim()) {
          setProjectFormData({
            ...projectFormData,
            team: [...projectFormData.team, projectFormData.newMemberInput.trim()],
            newMemberInput: ''
          });
        }
      };

      const handleRemoveTeamMember = (member: string) => {
        setProjectFormData({
          ...projectFormData,
          team: projectFormData.team.filter(m => m !== member)
        });
      };

      const handleCreateProject = async () => {
        if (!projectFormData.name.trim()) return;

        try {
          // 调用 API 创建项目（自动使用当前团队的 teamId）
          const newProject = await projectsApi.create({
            name: projectFormData.name,
            client: projectFormData.client || '客户',
            lead: projectFormData.lead || '待定',
            postLead: projectFormData.postLead || '待定',
            group: projectFormData.group || '未分类',
          });
          
          // 添加到本地状态
          dispatch({
            type: 'ADD_PROJECT',
            payload: {
              id: newProject.id,
              name: newProject.name,
              client: newProject.client || projectFormData.client || '客户',
              lead: newProject.lead || projectFormData.lead || '待定',
              postLead: newProject.postLead || projectFormData.postLead || '待定',
              group: newProject.group || projectFormData.group || '未分类',
              status: newProject.status || 'active',
              createdDate: newProject.createdDate || new Date().toISOString().split('T')[0],
              team: projectFormData.team
            }
          });

          // 重置表单
          setProjectFormData({ 
            name: '', 
            client: '', 
            lead: '',
            postLead: '',
            group: '',
            isNewGroup: false,
            team: [],
            newMemberInput: ''
          });
        } catch (error) {
          console.error('Failed to create project:', error);
          alert('创建项目失败，请重试');
        }
      };

      return (
        <>
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">新建项目</h2>
              <p className="text-xs text-zinc-500 mt-0.5">创建新项目以开始工作</p>
            </div>
            <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">项目名称 (YYMM_...)</label>
                <input 
                  autoFocus
                  type="text" 
                  value={projectFormData.name || initialName}
                  onChange={(e) => setProjectFormData({...projectFormData, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Leads Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">项目负责人</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="姓名"
                      value={projectFormData.lead}
                      onChange={(e) => setProjectFormData({...projectFormData, lead: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">后期负责人</label>
                  <div className="relative">
                    <Users className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-600" />
                    <input 
                      type="text" 
                      placeholder="姓名"
                      value={projectFormData.postLead}
                      onChange={(e) => setProjectFormData({...projectFormData, postLead: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">客户名称</label>
                <input 
                  type="text" 
                  placeholder="例如：Nike、Apple..."
                  value={projectFormData.client}
                  onChange={(e) => setProjectFormData({...projectFormData, client: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">所属组别 / 分类</label>
                {projectFormData.isNewGroup ? (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="输入新组名..."
                      value={projectFormData.group}
                      onChange={(e) => setProjectFormData({...projectFormData, group: e.target.value})}
                      className="flex-1 bg-zinc-950 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none"
                    />
                    <button 
                      onClick={() => setProjectFormData({...projectFormData, isNewGroup: false, group: initialGroup})}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select 
                      value={projectFormData.group || initialGroup}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setProjectFormData({...projectFormData, isNewGroup: true, group: ''});
                        } else {
                          setProjectFormData({...projectFormData, group: e.target.value});
                        }
                      }}
                      className="w-full appearance-none bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none"
                    >
                      <option value="广告片">广告片</option>
                      <option value="社交媒体">社交媒体</option>
                      <option value="长视频">长视频</option>
                      <option value="纪录片">纪录片</option>
                      {existingGroups.filter(g => !['广告片', '社交媒体', '长视频', '纪录片'].includes(g)).map(g => <option key={g} value={g}>{g}</option>)}
                      <option disabled>──────────</option>
                      <option value="__NEW__">+ 新建组别</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">团队成员</label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    placeholder="添加成员姓名..."
                    value={projectFormData.newMemberInput}
                    onChange={(e) => setProjectFormData({...projectFormData, newMemberInput: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTeamMember()}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none"
                  />
                  <button 
                    onClick={handleAddTeamMember}
                    className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                  >
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {projectFormData.team.map((member, idx) => (
                    <span key={idx} className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {member}
                      <button onClick={() => handleRemoveTeamMember(member)} className="text-zinc-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {projectFormData.team.length === 0 && <span className="text-xs text-zinc-600 italic">暂无成员</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            <button 
              onClick={handleCreateProject}
              disabled={!projectFormData.name.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>创建项目</span>
            </button>
          </div>
        </>
      );
    }

  };

  // --- DELIVERY MODULE LOGIC ---
  const renderDeliveryWorkbench = () => {
    if (!project || !delivery) return <EmptyWorkbench message="请选择一个待交付项目" onClose={handleClose} />;
    
    // 如果项目已交付，显示对外交付界面
    if (project.status === 'delivered') {
      return renderDeliveredWorkbench();
    }
    
    const projectVideos = videos.filter(v => v.projectId === project.id);
    const mainDeliveryVideos = projectVideos.filter(v => v.isMainDelivery);
    
    // 检查是否所有必需项都完成（包括标签）
    const allMainDeliveryHasTags = mainDeliveryVideos.length > 0 && mainDeliveryVideos.every(v => v.tags && v.tags.length > 0);
    const isReady = delivery.hasCleanFeed && 
                    delivery.hasTechReview && 
                    delivery.hasCopyrightCheck && 
                    delivery.hasMetadata &&
                    mainDeliveryVideos.length > 0 && // 至少需要一个主交付文件
                    allMainDeliveryHasTags; // 所有主交付文件必须有标签

    // 获取系统内既有的标签（从 state.tags 获取，这是从 API 获取的真实标签数据）
    const apiTags = state.tags.map(t => t.name);
    const existingTags = Array.from(new Set(videos.flatMap(v => v.tags || []))).filter(Boolean);
    const availableTags = Array.from(new Set([...apiTags, ...existingTags]));
    
    const CheckItem = ({ label, field, required = false }: { label: string, field: keyof DeliveryData, required?: boolean }) => (
        <div 
            onClick={() => dispatch({ 
                type: 'UPDATE_DELIVERY_CHECKLIST', 
                payload: { projectId: project.id, field, value: !delivery[field as keyof DeliveryData] } 
            })}
            className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
        >
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${delivery[field as keyof DeliveryData] ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                {delivery[field as keyof DeliveryData] && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
            </div>
            <span className="text-sm text-zinc-300 flex-1">{label}</span>
            {required && <span className="text-[10px] text-orange-400">必需</span>}
        </div>
    );

    const UploadPrompt = ({ icon: Icon, label, field, required = false }: { icon: React.ElementType, label: string, field: keyof DeliveryData, required?: boolean }) => {
        const isUploaded = delivery[field as keyof DeliveryData];
        return (
            <div className={`p-3 rounded-lg border transition-colors ${isUploaded ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${isUploaded ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                        <Icon className={`w-4 h-4 ${isUploaded ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-300">{label}</span>
                            {required && <span className="text-[10px] text-orange-400">必需</span>}
                        </div>
                        {isUploaded ? (
                            <span className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                已上传
                            </span>
                        ) : (
                            <button className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-0.5 flex items-center gap-1">
                                <Upload className="w-3 h-3" />
                                点击上传
                            </button>
                        )}
                    </div>
                    {!isUploaded && (
                        <button 
                            onClick={() => dispatch({ 
                                type: 'UPDATE_DELIVERY_CHECKLIST', 
                                payload: { projectId: project.id, field, value: true } 
                            })}
                            className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                        >
                            上传
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const handleToggleMainDelivery = (videoId: string) => {
        dispatch({ type: 'TOGGLE_MAIN_DELIVERY', payload: videoId });
    };

    const toggleVideoTag = (video: Video, tag: string) => {
        const current = video.tags || [];
        const nextTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
        dispatch({ type: 'UPDATE_VIDEO_TAGS', payload: { videoId: video.id, tags: nextTags } });
    };

    return (
        <>
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-100">交付操作台</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>
                </div>
                <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                {/* 1. 指定主交付文件 */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Film className="w-3 h-3" />
                        指定主交付文件
                    </h3>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden mb-2">
                        {projectVideos.length === 0 ? (
                            <div className="p-4 text-center text-xs text-zinc-500">该项目暂无视频文件</div>
                        ) : (
                            projectVideos.map(v => (
                                <div key={v.id} className="flex flex-col gap-2 p-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-900 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <PlaySquare className="w-4 h-4 text-zinc-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs text-zinc-300 truncate block">{v.name}</span>
                                                {v.resolution && (
                                                    <span className="text-[10px] text-zinc-500 mt-0.5 block">{v.resolution}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleToggleMainDelivery(v.id)}
                                                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                                                    v.isMainDelivery 
                                                        ? 'bg-indigo-500 text-white border-indigo-400' 
                                                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
                                                }`}
                                            >
                                                {v.isMainDelivery ? '主交付' : '设为主交付'}
                                            </button>
                                        </div>
                                    </div>
                                    {v.isMainDelivery && (
                                        <div className="pl-7">
                                            <div className="text-[10px] text-zinc-500 mb-1">点击标签进行选择（必填）</div>
                                            <div className="flex flex-wrap gap-2">
                                                {availableTags.map(tag => {
                                                    const selected = (v.tags || []).includes(tag);
                                                    return (
                                                        <button
                                                            key={tag}
                                                            onClick={() => toggleVideoTag(v, tag)}
                                                            className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${
                                                                selected
                                                                ? 'bg-indigo-500 text-white border-indigo-400'
                                                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                                                            }`}
                                                        >
                                                            {selected ? '✓ ' : ''}{tag}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">
                        主交付文件将在案例模块中展示，通常为适合网络传播和观看的H.264版本。可以指定一个或多个视频。
                    </p>
                </div>

                {/* 2. 文件上传提示 */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <UploadCloud className="w-3 h-3" />
                        文件上传
                    </h3>
                    <div className="space-y-2">
                        <UploadPrompt icon={Film} label="净版视频 (Clean Feed)" field="hasCleanFeed" required />
                        <UploadPrompt icon={FileVideo} label="不同分辨率文件" field="hasMultiResolution" />
                        <UploadPrompt icon={FileText} label="视频文稿" field="hasScript" />
                        <UploadPrompt icon={Copyright} label="版权文件" field="hasCopyrightFiles" />
                    </div>
                </div>

                {/* 3. 流程检查 */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        流程检查
                    </h3>
                    <div className="space-y-2">
                        <CheckItem label="技术审查通过 ✅" field="hasTechReview" required />
                        <CheckItem label="字体/音乐/视频版权风险确认 ✅" field="hasCopyrightCheck" required />
                        <CheckItem label="元数据完整 ✅" field="hasMetadata" required />
                    </div>
                </div>

                {/* 4. 交付说明 */}
                <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        交付说明
                    </h3>
                    <textarea
                        value={delivery.deliveryNote || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_DELIVERY_NOTE', payload: { projectId: project.id, note: e.target.value } })}
                        placeholder="请填写该项目的最终交付情况说明..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-24 placeholder-zinc-600"
                    />
                </div>

            {/* 5. 交付状态提示 */}
            {!isReady && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-orange-200">
                            <p className="font-bold mb-1">请完成以下步骤：</p>
                            <ul className="list-disc list-inside space-y-0.5 text-orange-200/80">
                                {!delivery.hasCleanFeed && <li>上传净版视频</li>}
                                {mainDeliveryVideos.length === 0 && <li>指定至少一个主交付文件</li>}
                                {mainDeliveryVideos.length > 0 && !allMainDeliveryHasTags && <li>给所有主交付文件添加标签（必填）</li>}
                                {!delivery.hasTechReview && <li>完成技术审查</li>}
                                {!delivery.hasCopyrightCheck && <li>确认版权风险</li>}
                                {!delivery.hasMetadata && <li>确认元数据完整</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm space-y-2">
                 <button 
                    disabled={!isReady}
                    onClick={() => {
                        if (window.confirm("确认完成交付？这将锁定当前交付内容的状态并更新项目状态。")) {
                            dispatch({ type: 'COMPLETE_DELIVERY', payload: project.id });
                        }
                    }}
                    className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all
                        ${isReady 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                 >
                    <FileCheck className="w-4 h-4" />
                    <span>完成交付</span>
                 </button>
                 <button 
                    disabled={!isReady}
                    onClick={() => {
                        if (window.confirm("确认创建交付链接？这将生成一个交付链接，但不会更新项目状态。")) {
                            // 创建链接但不完成交付
                            const tempDelivery = { ...delivery, deliveryTitle: delivery.deliveryTitle || project.name, deliveryDescription: delivery.deliveryDescription || delivery.deliveryNote || '' };
                            if (tempDelivery.deliveryTitle) {
                                dispatch({ 
                                    type: 'GENERATE_DELIVERY_LINK', 
                                    payload: { projectId: project.id, fileIds: projectVideos.map(v => v.id) } 
                                });
                            } else {
                                alert('请先填写交付标题');
                            }
                        }
                    }}
                    className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all
                        ${isReady 
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                 >
                    <Link2 className="w-4 h-4" />
                    <span>创建链接</span>
                 </button>
            </div>

        </>
    );
  };

  // 已交付项目的对外交付界面
  const renderDeliveredWorkbench = () => {
    if (!project || !delivery) return null;
    const { selectedDeliveryFiles } = state;
    const projectVideos = videos.filter(v => v.projectId === project.id);
    const selectedCount = selectedDeliveryFiles.length;

    return (
      <>
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">对外交付</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>
          </div>
          <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
          {/* 交付记录 */}
          {delivery.deliveryPackages && delivery.deliveryPackages.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                <Package className="w-3 h-3" />
                交付记录
              </h3>
              <div className="space-y-2">
                {delivery.deliveryPackages.map(pkg => (
                  <div key={pkg.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-200 mb-1">{pkg.title}</div>
                        <div className="text-xs text-zinc-500 mb-2">{pkg.description}</div>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                          <span>创建时间：{new Date(pkg.createdAt).toLocaleDateString('zh-CN')}</span>
                          <span>下载次数：{pkg.downloadCount}</span>
                          <span className={`px-2 py-0.5 rounded ${pkg.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {pkg.isActive ? '已启用' : '已停用'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'TOGGLE_DELIVERY_PACKAGE', payload: { packageId: pkg.id, isActive: !pkg.isActive } })}
                        className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                          pkg.isActive 
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30' 
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                      >
                        {pkg.isActive ? '停用' : '启用'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                      <input
                        type="text"
                        readOnly
                        value={pkg.link}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-400 font-mono"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(pkg.link)}
                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors"
                      >
                        复制
                      </button>
                      <button
                        onClick={() => window.open(pkg.link, '_blank')}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
                      >
                        查看
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 选择交付文件提示 */}
          {selectedCount === 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200">
                  <p className="font-bold mb-1">请在浏览区选择交付文件</p>
                  <p className="opacity-80">可以单选或多选文件，然后在此填写交付标题和说明生成交付链接。</p>
                </div>
              </div>
            </div>
          )}

          {selectedCount > 0 && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-200">已选择 {selectedCount} 个文件</span>
                  <button
                    onClick={() => dispatch({ type: 'CLEAR_DELIVERY_FILE_SELECTION' })}
                    className="ml-auto text-xs text-emerald-300 hover:text-emerald-200 underline"
                  >
                    清空选择
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">交付标题</label>
                <input
                  type="text"
                  value={delivery.deliveryTitle || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_DELIVERY_TITLE', payload: { projectId: project.id, title: e.target.value } })}
                  placeholder="例如：Porsche 911 Launch Campaign"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 mt-1">此标题将作为交付文件夹的文件名</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">交付说明</label>
                <textarea
                  value={delivery.deliveryDescription || ''}
                  onChange={(e) => dispatch({ type: 'UPDATE_DELIVERY_DESCRIPTION', payload: { projectId: project.id, description: e.target.value } })}
                  placeholder="请填写对外交付的说明，客户将看到此内容..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-32 placeholder-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 mt-1">此说明将生成文本文档存入交付文件夹</p>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <button
            disabled={!delivery.deliveryTitle || !delivery.deliveryTitle.trim() || selectedCount === 0}
            onClick={() => {
              if (window.confirm(`确认生成交付链接？系统将自动打包选中的 ${selectedCount} 个文件并生成交付说明文档。`)) {
                dispatch({ 
                  type: 'GENERATE_DELIVERY_LINK', 
                  payload: { projectId: project.id, fileIds: selectedDeliveryFiles } 
                });
              }
            }}
            className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all
              ${delivery.deliveryTitle && delivery.deliveryTitle.trim() && selectedCount > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
          >
            <Link2 className="w-4 h-4" />
            <span>生成交付链接</span>
          </button>
        </div>
      </>
    );
  };

  // --- SHOWCASE MODULE LOGIC ---
  const renderShowcaseWorkbench = () => {
    const cartItems = videos.filter(v => cart.includes(v.id));

    return (
        <>
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div>
                   <h2 className="text-sm font-semibold text-zinc-100">打包购物车</h2>
                   <p className="text-xs text-zinc-500 mt-0.5">{cart.length} 项已选择</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => {}} className="text-xs text-indigo-400 hover:text-indigo-300">清空</button>
                    <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                        <MonitorPlay className="w-8 h-8 mb-2 opacity-20" />
                        <p className="text-xs">选择案例视频以构建Showreel</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded group hover:border-zinc-700">
                                <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                                <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden shrink-0">
                                     <img src={`https://picsum.photos/seed/${item.id}/100/100`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-zinc-200 truncate">{item.name}</div>
                                    <div className="text-[10px] text-zinc-500">{item.duration} • {item.size}</div>
                                </div>
                                <button 
                                    onClick={() => dispatch({ type: 'TOGGLE_CART_ITEM', payload: item.id })}
                                    className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                 <button 
                    disabled={cart.length === 0}
                    onClick={() => alert("模拟生成数据包：\n- Microsite 已创建\n- 下载链接已生成")}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                 >
                    <Share className="w-4 h-4" />
                    <span>生成数据包</span>
                 </button>
            </div>
        </>
    );
  };

  // 初始化项目组别映射
  useEffect(() => {
    if (settingsActiveTab === 'projects') {
      const map: Record<string, string> = {};
      projects.forEach(p => {
        map[p.id] = p.group;
      });
      setProjectGroupMap(map);
    }
  }, [settingsActiveTab, projects]);

  // 加载团队成员数据
  useEffect(() => {
    if (settingsActiveTab === 'team' && isAdmin) {
      setLoadingTeamMembers(true);
      usersApi.getAll()
        .then(data => {
          setTeamMembers(data);
        })
        .catch(error => {
          console.error('Failed to load team members:', error);
        })
        .finally(() => {
          setLoadingTeamMembers(false);
        });
    }
  }, [settingsActiveTab, isAdmin]);

  // --- SETTINGS MODULE LOGIC ---
  const renderSettingsWorkbench = () => {
    // 获取所有组别
    const allGroups = Array.from(new Set(projects.map(p => p.group).filter(g => g && g !== '未分类')));

    const handleDeleteGroup = (groupName: string) => {
      if (window.confirm(`确认删除组别"${groupName}"？该组下的项目将被移动到"未分类"组。`)) {
        // 更新所有属于该组别的项目
        projects.filter(p => p.group === groupName).forEach(p => {
          dispatch({
            type: 'UPDATE_PROJECT',
            payload: { ...p, group: '未分类' }
          });
        });
      }
    };

    const handleRenameGroup = (oldName: string, newName: string) => {
      if (!newName.trim() || newName === oldName) {
        setEditingGroup(null);
        return;
      }
      // 更新所有属于该组别的项目
      projects.filter(p => p.group === oldName).forEach(p => {
        dispatch({
          type: 'UPDATE_PROJECT',
          payload: { ...p, group: newName }
        });
      });
      setEditingGroup(null);
    };

    const handleDeleteTag = async (tagId: string) => {
      if (window.confirm('确认删除此标签？')) {
        // 从状态中移除标签
        const updatedTags = tags.filter(t => t.id !== tagId);
        updatedTags.forEach(t => {
          dispatch({ type: 'ADD_TAG', payload: t });
        });
        // 这里应该调用API删除标签，但暂时只更新本地状态
      }
    };

    const handleCreateTag = async () => {
      if (!newTagName.trim()) return;
      try {
        const newTag = await tagsApi.create(newTagName.trim());
        dispatch({ type: 'ADD_TAG', payload: newTag });
        setNewTagName('');
      } catch (error) {
        console.error('创建标签失败:', error);
        alert('创建标签失败');
      }
    };

    const handleUpdateProjectGroup = (projectId: string, newGroup: string) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        dispatch({
          type: 'UPDATE_PROJECT',
          payload: { ...project, group: newGroup }
        });
        setProjectGroupMap({ ...projectGroupMap, [projectId]: newGroup });
      }
    };

    if (!isAdmin) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-end">
            <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <ShieldAlert className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">需要管理员权限</p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">系统设置</h2>
            <p className="text-xs text-zinc-500 mt-0.5">管理员功能</p>
          </div>
          <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setSettingsActiveTab('groups')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              settingsActiveTab === 'groups' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-1.5" />
            组别
          </button>
          <button
            onClick={() => setSettingsActiveTab('projects')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              settingsActiveTab === 'projects' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileVideo className="w-4 h-4 inline mr-1.5" />
            项目
          </button>
          <button
            onClick={() => setSettingsActiveTab('tags')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              settingsActiveTab === 'tags' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-1.5" />
            标签
          </button>
          <button
            onClick={() => setSettingsActiveTab('team')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              settingsActiveTab === 'team' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            团队成员
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {/* Groups Tab */}
          {settingsActiveTab === 'groups' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">管理组别</h3>
                <div className="space-y-2">
                  {allGroups.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">暂无组别</p>
                  ) : (
                    allGroups.map(group => (
                      <div key={group} className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                        {editingGroup === group ? (
                          <>
                            <input
                              type="text"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameGroup(group, newGroupName);
                                } else if (e.key === 'Escape') {
                                  setEditingGroup(null);
                                  setNewGroupName('');
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-zinc-900 border border-indigo-500 rounded px-2 py-1 text-xs text-zinc-100 outline-none"
                            />
                            <button
                              onClick={() => handleRenameGroup(group, newGroupName)}
                              className="p-1.5 text-indigo-400 hover:text-indigo-300"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingGroup(null);
                                setNewGroupName('');
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <FolderOpen className="w-4 h-4 text-zinc-500" />
                            <span className="flex-1 text-sm text-zinc-200">{group}</span>
                            <span className="text-xs text-zinc-500">
                              {projects.filter(p => p.group === group).length} 个项目
                            </span>
                            <button
                              onClick={() => {
                                setEditingGroup(group);
                                setNewGroupName(group);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-indigo-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              className="p-1.5 text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {settingsActiveTab === 'projects' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">管理项目</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">暂无项目</p>
                  ) : (
                    projects.map(p => (
                      <div key={p.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-zinc-200">{p.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            p.status === 'finalized' ? 'bg-orange-500/20 text-orange-400' :
                            p.status === 'delivered' ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>
                            {p.status === 'active' ? '进行中' :
                             p.status === 'finalized' ? '已定版' :
                             p.status === 'delivered' ? '已交付' : '已归档'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-500">组别:</label>
                          <select
                            value={projectGroupMap[p.id] || p.group}
                            onChange={(e) => handleUpdateProjectGroup(p.id, e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 outline-none focus:border-indigo-500"
                          >
                            <option value="未分类">未分类</option>
                            {allGroups.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {settingsActiveTab === 'tags' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">管理标签</h3>
                
                {/* Create New Tag */}
                <div className="mb-4 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTag();
                        }
                      }}
                      placeholder="输入新标签名称..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleCreateTag}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors"
                    >
                      <PlusSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {tags.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">暂无标签</p>
                  ) : (
                    tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-2 p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                        <Tag className="w-4 h-4 text-zinc-500" />
                        <span className="flex-1 text-sm text-zinc-200">{tag.name}</span>
                        {tag.category && (
                          <span className="text-[10px] text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
                            {tag.category}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">
                          使用 {tag.usageCount || 0} 次
                        </span>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Team Members Tab */}
          {settingsActiveTab === 'team' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3">团队成员管理</h3>
                
                {loadingTeamMembers ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">加载中...</div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">暂无团队成员</p>
                    ) : (
                      teamMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt={member.name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-200 truncate">{member.name}</div>
                            <div className="text-xs text-zinc-500 truncate">{member.email}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded ${
                            member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            member.role === 'sales' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-800 text-zinc-500'
                          }`}>
                            {member.role === 'admin' ? '管理员' :
                             member.role === 'sales' ? '销售' :
                             member.role === 'member' ? '成员' : member.role}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // 在dashboard模块时，根据workbenchActionType决定显示什么内容
  const effectiveModule = activeModule === 'dashboard' ? (workbenchActionType || 'review') : activeModule;

  return (
    <aside className={`fixed top-[70px] bottom-[45px] right-[15px] w-[360px] ${theme.bg.secondary} rounded-xl border ${theme.border.primary} z-30 shadow-2xl shadow-black/50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${visible ? 'translate-x-0' : 'translate-x-[400px]'}`}>
        {effectiveModule === 'review' && renderReviewWorkbench()}
        {effectiveModule === 'delivery' && renderDeliveryWorkbench()}
        {effectiveModule === 'showcase' && renderShowcaseWorkbench()}
        {effectiveModule === 'settings' && renderSettingsWorkbench()}
    </aside>
  );
};

const EmptyWorkbench: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
    <div className="flex-1 flex flex-col h-full">
         <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-end">
            <button onClick={onClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <MonitorPlay className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">{message}</p>
        </div>
    </div>
);
