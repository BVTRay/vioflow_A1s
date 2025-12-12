
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, X, Share, PlaySquare, FileCheck, ShieldAlert, MonitorPlay, GripVertical, FileVideo, AlertCircle, GitBranch, PlusSquare, History, ArrowRight, Upload, FileText, Copyright, Film, Tag, CheckCircle, Link2, Package, Download, Power, User, Users, ChevronDown, Settings, FolderOpen, Trash2, Edit2, Save } from 'lucide-react';
import { useStore } from '../../App';
import { Video, DeliveryData } from '../../types';
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
  const { activeModule, selectedProjectId, selectedVideoId, projects, deliveries, cart, videos, workbenchActionType, tags } = state;
  const project = projects.find(p => p.id === selectedProjectId);
  const delivery = deliveries.find(d => d.projectId === selectedProjectId);
  const selectedVideo = videos.find(v => v.id === selectedVideoId);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
      conflictMode: 'iterate' | 'new'; // Renamed to match logic
      existingVideo?: Video;
      nextVersion: number;
      changeLog: string;
  }>({
      isOpen: false,
      file: null,
      conflictMode: 'new',
      nextVersion: 1,
      changeLog: ''
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
      if (!project) return;

      // Logic: Strip version prefix "vXX_" to match base names
      const cleanName = file.name.replace(/^v\d+_/, '');
      
      // Find any video in this project that shares the same base name
      const matchedVideo = videos.find(v => 
          v.projectId === project.id && 
          v.name.replace(/^v\d+_/, '') === cleanName
      );

      let nextVer = 1;
      let conflictMode: 'iterate' | 'new' = 'new';

      if (matchedVideo) {
          conflictMode = 'iterate'; // Default to iterate if match found
          // Find max version of this "series"
          const seriesVersions = videos
              .filter(v => v.projectId === project.id && v.name.replace(/^v\d+_/, '') === cleanName)
              .map(v => v.version);
          const maxVer = Math.max(0, ...seriesVersions);
          nextVer = maxVer + 1;
      }

      setUploadConfig({
          isOpen: true,
          file: file,
          conflictMode: conflictMode,
          existingVideo: matchedVideo,
          nextVersion: nextVer,
          changeLog: ''
      });
  };

  const startUpload = () => {
      if (!uploadConfig.file || !project) return;

      setUploadConfig(prev => ({ ...prev, isOpen: false }));

      // Generate Final Filename
      // If Iterate: v{nextVersion}_{BaseName}
      // If New: v1_{OriginalName (stripped of v prefix just in case)}
      const baseName = uploadConfig.file.name.replace(/^v\d+_/, '');
      
      const versionPrefix = uploadConfig.conflictMode === 'iterate' 
          ? `v${uploadConfig.nextVersion}_` 
          : `v1_`;
      
      const finalName = `${versionPrefix}${baseName}`;
      const finalVersion = uploadConfig.conflictMode === 'iterate' ? uploadConfig.nextVersion : 1;

      const uploadId = `u_${Date.now()}`;

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

      // 3. Simulate Progress
      let progress = 0;
      const interval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 100) progress = 100;

          dispatch({
              type: 'UPDATE_UPLOAD_PROGRESS',
              payload: { id: uploadId, progress: Math.floor(progress) }
          });

          if (progress === 100) {
              clearInterval(interval);
              setTimeout(() => {
                  // Finish
                  dispatch({ type: 'COMPLETE_UPLOAD', payload: uploadId });
                  dispatch({
                      type: 'ADD_VIDEO',
                      payload: {
                          id: `v${Date.now()}`,
                          projectId: project.id,
                          name: finalName,
                          type: 'video',
                          url: '',
                          version: finalVersion,
                          uploadTime: '刚刚',
                          isCaseFile: false,
                          isMainDelivery: false,
                          size: (uploadConfig.file!.size / (1024 * 1024)).toFixed(1) + ' MB',
                          duration: '00:00:00', // Mocked
                          resolution: '1920x1080', // Mocked
                          status: 'initial',
                          changeLog: uploadConfig.changeLog || '上传新文件'
                      }
                  });
              }, 800);
          }
      }, 300);
  };


  const handleClose = () => {
      dispatch({ type: 'TOGGLE_WORKBENCH', payload: false });
      if (activeModule === 'dashboard') {
        dispatch({ type: 'SET_WORKBENCH_ACTION_TYPE', payload: null });
      }
  };

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

  const renderReviewWorkbench = () => {
    if (selectedVideo) {
        // Find historical versions of this video (same project, same base name)
        const baseName = selectedVideo.name.replace(/^v\d+_/, '');
        const historyVersions = videos.filter(v => 
            v.projectId === selectedVideo.projectId && 
            v.name.replace(/^v\d+_/, '') === baseName
        ).sort((a, b) => b.version - a.version); // Sort Descending (Newest first)

        return (
            <div className="flex flex-col h-full">
                <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-start">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-100">视频详情</h2>
                        <p className="text-xs text-zinc-500 mt-1 truncate max-w-[200px]">{selectedVideo.name}</p>
                    </div>
                    <button onClick={() => dispatch({ type: 'SELECT_VIDEO', payload: null })}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
                </div>
                <div className="p-5 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Preview */}
                    <div className="aspect-video bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center relative overflow-hidden group">
                         <img src={`https://picsum.photos/seed/${selectedVideo.id}/400/225`} className="w-full h-full object-cover opacity-60" />
                         <PlaySquare className="w-10 h-10 text-white opacity-80" />
                    </div>

                    {/* Metadata */}
                    <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs space-y-2">
                        <div className="flex justify-between"><span className="text-zinc-500">版本</span><span className="text-zinc-200 font-mono">v{selectedVideo.version}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">分辨率</span><span className="text-zinc-200">{selectedVideo.resolution || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">时长</span><span className="text-zinc-200">{selectedVideo.duration}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">状态</span><span className="text-indigo-400 capitalize">{selectedVideo.status === 'initial' ? '初次上传' : selectedVideo.status === 'annotated' ? '已批注' : '已定版'}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">大小</span><span className="text-zinc-200">{selectedVideo.size}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">上传时间</span><span className="text-zinc-200">{selectedVideo.uploadTime}</span></div>
                    </div>
                    
                    {/* Change Log */}
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">修改日志</h3>
                        <p className="text-sm text-zinc-300 bg-zinc-800/50 p-3 rounded border border-zinc-800 leading-relaxed min-h-[60px]">
                            {selectedVideo.changeLog || "无修改说明"}
                        </p>
                    </div>

                    {/* History Versions */}
                    {historyVersions.length > 1 && (
                        <div>
                             <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
                                <History className="w-3 h-3" />
                                历史版本
                             </h3>
                             <div className="space-y-1">
                                 {historyVersions.map(v => (
                                     <div 
                                        key={v.id}
                                        onClick={() => dispatch({ type: 'SELECT_VIDEO', payload: v.id })}
                                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors border ${
                                            v.id === selectedVideo.id 
                                            ? 'bg-indigo-500/10 border-indigo-500/30' 
                                            : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                                        }`}
                                     >
                                         <div className="flex items-center gap-2">
                                             <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${v.id === selectedVideo.id ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                                 v{v.version}
                                             </div>
                                             <div className="flex flex-col">
                                                 <span className={`text-xs ${v.id === selectedVideo.id ? 'text-indigo-200' : 'text-zinc-400'}`}>{v.uploadTime}</span>
                                             </div>
                                         </div>
                                         {v.id !== selectedVideo.id && <ArrowRight className="w-3 h-3 text-zinc-600" />}
                                         {v.id === selectedVideo.id && <span className="text-[10px] text-indigo-400">当前</span>}
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // 如果没有选中项目，显示新建项目表单
    if (!project) {
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
              createdDate: newProject.created_date || new Date().toISOString().split('T')[0],
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

    return (
        <>
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <div>
                   <h2 className="text-sm font-semibold text-zinc-100">收录与审阅</h2>
                   <p className="text-xs text-zinc-500 mt-0.5">{project.name}</p>
                </div>
                <button onClick={handleClose}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-200" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {/* Upload Zone */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="video/*"
                    onChange={handleFileInputChange}
                />
                
                <div 
                    onClick={() => fileInputRef.current?.click()} 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group mb-6 relative overflow-hidden
                        ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700/50 hover:border-indigo-500/50 hover:bg-indigo-500/5'}
                    `}
                >
                    <UploadCloud className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} />
                    <p className="text-sm text-zinc-300 font-medium">点击或拖放视频文件至此</p>
                    <p className="text-xs text-zinc-500 mt-1">自动识别版本号</p>
                </div>

                <div className="bg-zinc-800/30 border border-zinc-800 rounded p-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 mb-2 text-zinc-300 font-medium">
                        <ShieldAlert className="w-4 h-4 text-orange-400" />
                        <span>项目状态：{project.status === 'active' ? '进行中' : '已锁定'}</span>
                    </div>
                    <p>您可以继续上传视频，系统将自动分配 v{Math.max(...videos.filter(v=>v.projectId===project.id).map(v=>v.version), 0) + 1} 等版本号。</p>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                 <button 
                    disabled={project.status !== 'active'}
                    onClick={() => {
                        if(window.confirm("确认定版项目？这将锁定项目并移至交付阶段。")) {
                            dispatch({ type: 'FINALIZE_PROJECT', payload: project.id });
                        }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20"
                 >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>项目定版</span>
                 </button>
            </div>

            {/* Upload Configuration Modal */}
            {uploadConfig.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                         <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 rounded-t-xl">
                            <h3 className="font-semibold text-zinc-100">上传视频配置</h3>
                            <button onClick={() => setUploadConfig({...uploadConfig, isOpen: false})}><X className="w-4 h-4 text-zinc-500" /></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded border border-zinc-800">
                                <FileVideo className="w-8 h-8 text-indigo-500" />
                                <div className="min-w-0">
                                    <div className="text-sm text-zinc-200 truncate" title={uploadConfig.file?.name}>{uploadConfig.file?.name}</div>
                                    <div className="text-xs text-zinc-500">{(uploadConfig.file!.size / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                            </div>

                            {uploadConfig.existingVideo ? (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-3 text-xs text-indigo-200 flex gap-2 items-start">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-bold mb-1">检测到相似视频序列</div>
                                        <span>系统识别到 "{uploadConfig.existingVideo.name.replace(/^v\d+_/, '')}"。请选择操作：</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-zinc-800/30 border border-zinc-700 rounded p-3 text-xs text-zinc-400 flex gap-2">
                                    <PlusSquare className="w-4 h-4 shrink-0" />
                                    <span>未检测到同名序列，将作为新视频 (v1) 上传。</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div 
                                    onClick={() => setUploadConfig({...uploadConfig, conflictMode: 'iterate'})}
                                    className={`cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 text-center transition-all ${
                                        uploadConfig.conflictMode === 'iterate' 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                    } ${!uploadConfig.existingVideo ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <GitBranch className="w-5 h-5" />
                                    <div>
                                        <div className="text-xs font-bold">迭代版本</div>
                                        <div className="text-[10px] mt-0.5 opacity-80">v{uploadConfig.nextVersion}</div>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setUploadConfig({...uploadConfig, conflictMode: 'new'})}
                                    className={`cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 text-center transition-all ${
                                        uploadConfig.conflictMode === 'new' 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                                    }`}
                                >
                                    <PlusSquare className="w-5 h-5" />
                                    <div>
                                        <div className="text-xs font-bold">新的视频</div>
                                        <div className="text-[10px] mt-0.5 opacity-80">v1</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">修改说明 (Change Log)</label>
                                <textarea 
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-200 focus:border-indigo-500 outline-none resize-none h-24 placeholder-zinc-600"
                                    placeholder="请简要说明本次视频的修改内容。例如：&#10;- 对客户基于v2版本的意见进行了修改&#10;- 完成了包装特效和调色"
                                    value={uploadConfig.changeLog}
                                    onChange={(e) => setUploadConfig({...uploadConfig, changeLog: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-950 rounded-b-xl">
                             <button onClick={() => setUploadConfig({...uploadConfig, isOpen: false})} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">取消</button>
                             <button onClick={startUpload} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all">确认上传</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
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
