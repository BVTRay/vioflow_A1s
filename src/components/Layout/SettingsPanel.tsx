import React, { useState, useEffect } from 'react';
import { useStore } from '../../App';
import { useAuth } from '../../hooks/useAuth';
import { useTeam } from '../../contexts/TeamContext';
import { projectsApi } from '../../api/projects';
import { tagsApi } from '../../api/tags';
import { teamsApi, Team, TeamMember } from '../../api/teams';
import { projectGroupsApi, ProjectGroup } from '../../api/project-groups';
import { usersApi } from '../../api/users';
import { 
  FolderOpen, FileVideo, Tag, Users, X, Trash2, Edit2, Save, PlusSquare, 
  Shield, UserPlus, Search, Copy, CheckCircle, XCircle, Settings as SettingsIcon, Check
} from 'lucide-react';
import { useThemeClasses } from '../../hooks/useThemeClasses';

type SettingsTab = 'teams' | 'groups' | 'projects' | 'tags';

export const SettingsPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { projects, tags } = state;
  const { user: currentUser } = useAuth();
  const { currentTeam: teamContextTeam, refreshTeams } = useTeam();
  
  // 检查权限：需要是管理员或超级管理员
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const [userTeamRole, setUserTeamRole] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  // Settings state - 使用全局状态
  const settingsActiveTab = state.settingsActiveTab;
  const setSettingsActiveTab = (tab: SettingsTab) => {
    dispatch({ type: 'SET_SETTINGS_TAB', payload: tab });
  };
  
  // 团队管理
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);
  const [teamFormData, setTeamFormData] = useState({ name: '', description: '' });
  const [joinTeamCode, setJoinTeamCode] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // 项目分组管理
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [loadingProjectGroups, setLoadingProjectGroups] = useState(false);
  const [projectGroupsError, setProjectGroupsError] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  
  // 标签和项目
  const [newTagName, setNewTagName] = useState('');
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>({});
  const [codeCopied, setCodeCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  
  // 添加成员相关状态
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberInput, setAddMemberInput] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'super_admin' | 'admin' | 'member'>('member');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  // 获取所有组别（旧方式，用于兼容）
  const allGroups = Array.from(new Set(projects.map(p => p.group).filter(g => g && g !== '未分类')));

  // 加载当前用户的团队信息和角色
  useEffect(() => {
    if (teamContextTeam) {
      setCurrentTeam(teamContextTeam);
      setSelectedTeamId(teamContextTeam.id);
      teamsApi.getUserRole(teamContextTeam.id)
        .then(roleData => {
          setUserTeamRole(roleData.role);
        })
        .catch(console.error);
    }
  }, [teamContextTeam]);


  // 加载团队列表
  useEffect(() => {
    if (settingsActiveTab === 'teams') {
      loadTeams();
    }
  }, [settingsActiveTab]);

  // 加载团队成员（使用当前团队）
  useEffect(() => {
    if (settingsActiveTab === 'teams' && currentTeam) {
      loadTeamMembers(currentTeam.id);
    }
  }, [settingsActiveTab, currentTeam]);

  // 加载项目分组
  useEffect(() => {
    if (settingsActiveTab === 'groups' && selectedTeamId) {
      loadProjectGroups();
    }
  }, [settingsActiveTab, selectedTeamId]);


  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const data = await teamsApi.findAll();
      setTeams(data);
      if (data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      alert('加载团队列表失败');
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const members = await teamsApi.getMembers(teamId);
      setTeamMembers(members);
      // 同时获取当前用户的角色
      const roleData = await teamsApi.getUserRole(teamId);
      setUserTeamRole(roleData.role);
    } catch (error) {
      console.error('Failed to load team members:', error);
      alert('加载团队成员失败');
    }
  };

  const loadProjectGroups = async () => {
    if (!selectedTeamId) {
      setProjectGroups([]);
      setProjectGroupsError(null);
      return;
    }
    setLoadingProjectGroups(true);
    setProjectGroupsError(null);
    try {
      const data = await projectGroupsApi.findAll(selectedTeamId);
      setProjectGroups(data || []);
    } catch (error: any) {
      console.error('Failed to load project groups:', error);
      // 如果是404或没有数据，静默处理，不显示错误
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        setProjectGroups([]);
        setProjectGroupsError(null);
      } else {
        // 其他错误在页面内显示，不弹窗
        setProjectGroups([]);
        setProjectGroupsError('加载项目分组失败，请稍后重试');
      }
    } finally {
      setLoadingProjectGroups(false);
    }
  };

  const handleClose = () => {
    dispatch({ type: 'SET_MODULE', payload: 'dashboard' });
  };


  // 团队管理函数
  const handleCreateTeam = async () => {
    if (!teamFormData.name.trim()) {
      alert('请输入团队名称');
      return;
    }
    try {
      const newTeam = await teamsApi.create(teamFormData);
      await loadTeams();
      setShowCreateTeam(false);
      setTeamFormData({ name: '', description: '' });
      alert('团队创建成功');
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('创建团队失败');
    }
  };

  const handleJoinTeam = async () => {
    if (!joinTeamCode.trim()) {
      alert('请输入团队编码');
      return;
    }
    try {
      await teamsApi.joinByCode({ code: joinTeamCode });
      await loadTeams();
      setShowJoinTeam(false);
      setJoinTeamCode('');
      alert('成功加入团队');
    } catch (error) {
      console.error('Failed to join team:', error);
      alert('加入团队失败，请检查团队编码是否正确');
    }
  };

  const handleCopyTeamCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('团队编码已复制到剪贴板');
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: 'super_admin' | 'admin' | 'member') => {
    if (!currentTeam) return;
    try {
      await teamsApi.updateMember(currentTeam.id, memberId, { role: newRole });
      await loadTeamMembers(currentTeam.id);
      alert('成员角色已更新');
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      const errorMsg = error?.response?.data?.message || error.message || '更新成员角色失败';
      alert(errorMsg);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentTeam) return;
    if (!window.confirm('确认移除该成员？')) return;
    try {
      await teamsApi.removeMember(currentTeam.id, memberId);
      await loadTeamMembers(currentTeam.id);
      await refreshTeams(); // 刷新团队列表
      alert('成员已移除');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      const errorMsg = error?.response?.data?.message || error.message || '移除成员失败';
      alert(errorMsg);
    }
  };

  // 搜索用户（通过邮箱或用户ID）
  const handleSearchUser = async () => {
    if (!addMemberInput.trim()) {
      alert('请输入邮箱或用户ID');
      return;
    }
    setSearchingUser(true);
    setFoundUser(null);
    try {
      // 判断是邮箱还是UUID
      const isEmail = addMemberInput.includes('@');
      if (isEmail) {
        const result = await usersApi.findByEmail(addMemberInput.trim());
        if (result.found && result.user) {
          setFoundUser(result.user);
        } else {
          alert('未找到该用户，请确认邮箱是否正确');
        }
      } else {
        // 假设是用户ID
        try {
          const user = await usersApi.getOne(addMemberInput.trim());
          setFoundUser(user);
        } catch (error) {
          alert('未找到该用户，请确认用户ID是否正确');
        }
      }
    } catch (error: any) {
      console.error('Failed to search user:', error);
      const errorMsg = error?.response?.data?.message || error.message || '查找用户失败';
      alert(errorMsg);
    } finally {
      setSearchingUser(false);
    }
  };

  // 添加成员
  const handleAddMember = async () => {
    if (!currentTeam || !foundUser) return;
    try {
      await teamsApi.addMember(currentTeam.id, {
        user_id: foundUser.id,
        role: addMemberRole,
      });
      await loadTeamMembers(currentTeam.id);
      await refreshTeams();
      setShowAddMember(false);
      setAddMemberInput('');
      setFoundUser(null);
      setAddMemberRole('member');
      alert('成员添加成功');
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const errorMsg = error?.response?.data?.message || error.message || '添加成员失败';
      alert(errorMsg);
    }
  };

  // 项目分组管理函数
  const handleCreateProjectGroup = async () => {
    if (!selectedTeamId || !newGroupName.trim()) {
      alert('请输入项目分组名称');
      return;
    }
    try {
      await projectGroupsApi.create({ name: newGroupName.trim(), description: newGroupDescription }, selectedTeamId);
      await loadProjectGroups();
      setNewGroupName('');
      setNewGroupDescription('');
      alert('项目分组创建成功');
    } catch (error) {
      console.error('Failed to create project group:', error);
      alert('创建项目分组失败');
    }
  };

  const handleUpdateProjectGroupName = async (groupId: string, newName: string) => {
    if (!selectedTeamId || !newName.trim()) return;
    try {
      await projectGroupsApi.update(groupId, { name: newName }, selectedTeamId);
      await loadProjectGroups();
      setEditingGroup(null);
      alert('项目分组已更新');
    } catch (error) {
      console.error('Failed to update project group:', error);
      alert('更新项目分组失败');
    }
  };

  const handleDeleteProjectGroup = async (groupId: string) => {
    if (!selectedTeamId) return;
    if (!window.confirm('确认删除此项目分组？该分组下的项目将被移动到"未分类"分组。')) return;
    try {
      await projectGroupsApi.remove(groupId, selectedTeamId);
      await loadProjectGroups();
      alert('项目分组已删除');
    } catch (error) {
      console.error('Failed to delete project group:', error);
      alert('删除项目分组失败');
    }
  };

  // 标签管理函数
  const handleDeleteTag = async (tagId: string) => {
    if (window.confirm('确认删除此标签？')) {
      try {
        await tagsApi.delete(tagId);
        const updatedTags = tags.filter(t => t.id !== tagId);
        updatedTags.forEach(t => {
          dispatch({ type: 'ADD_TAG', payload: t });
        });
      } catch (error) {
        console.error('Failed to delete tag:', error);
        alert('删除标签失败');
      }
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await tagsApi.create(newTagName.trim());
      dispatch({ type: 'ADD_TAG', payload: newTag });
      setNewTagName('');
    } catch (error) {
      console.error('Failed to create tag:', error);
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
      projectsApi.update(projectId, { group: newGroup }).catch(console.error);
    }
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

  // 权限检查
  const canManageTeam = userTeamRole === 'super_admin' || userTeamRole === 'admin';
  const canManageProjectGroups = canManageTeam;

  if (!isAdmin && !currentUser?.team_id) {
    return (
      <div className="fixed left-[64px] top-14 bottom-0 right-0 flex items-center justify-center">
        <div className={`text-center ${theme.text.muted}`}>
          <p className="text-sm">您没有权限访问设置页面</p>
        </div>
      </div>
    );
  }

  // 根据检索面板的可见性和模块类型调整位置
  // 设置模块：检索面板宽度为180px，其他模块为320px
  const getLeftOffset = () => {
    if (!state.isRetrievalPanelVisible) {
      return 'left-[64px]';
    }
    if (state.activeModule === 'settings') {
      return 'left-[244px]'; // 64px (sidebar) + 180px (retrieval panel)
    }
    return 'left-[384px]'; // 64px (sidebar) + 320px (retrieval panel)
  };
  
  const leftOffset = getLeftOffset();
  
  return (
    <div className={`fixed ${leftOffset} top-14 bottom-0 right-0 ${theme.bg.primary} transition-all duration-300`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${theme.border.primary} ${theme.bg.secondary} flex justify-between items-center`}>
          <div>
            <h2 className={`text-base font-semibold ${theme.text.primary}`}>系统设置</h2>
            <p className={`text-xs ${theme.text.muted} mt-0.5`}>
              {currentTeam ? `当前团队: ${currentTeam.name} (${userTeamRole || '成员'})` : '管理员功能'}
            </p>
          </div>
          <button onClick={handleClose}>
            <X className={`w-5 h-5 ${theme.text.muted} ${theme.text.hover}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* 团队管理标签页 */}
          {settingsActiveTab === 'teams' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h3 className={`text-sm font-semibold ${theme.text.muted} mb-6`}>团队管理</h3>
                
                {/* 顶部卡片：团队信息 */}
                {currentTeam ? (
                  <div className={`mb-6 p-6 bg-gradient-to-br ${theme.bg.secondary} ${theme.bg.primary} border ${theme.border.primary} rounded-xl shadow-lg`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Shield className="w-5 h-5 text-indigo-400" />
                          <h2 className={`text-xl font-semibold ${theme.text.primary}`}>{currentTeam.name}</h2>
                        </div>
                        {currentTeam.description && (
                          <p className={`text-xs ${theme.text.muted} mt-2`}>{currentTeam.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* 团队编码 */}
                    <div className={`flex items-center gap-3 p-4 ${theme.bg.tertiary}/50 rounded-lg border ${theme.border.secondary}`}>
                      <div className="flex-1">
                        <div className={`text-xs ${theme.text.muted} mb-1`}>团队编码</div>
                        <div className="flex items-center gap-2">
                          <code className={`text-base font-mono font-semibold ${theme.text.indigo}`}>{currentTeam.code}</code>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(currentTeam.code);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          } catch (error) {
                            alert('复制失败，请手动复制');
                          }
                        }}
                        className={`px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                          codeCopied 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                        title="复制团队编码"
                      >
                        {codeCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            复制编码
                          </>
                        )}
                      </button>
                    </div>

                    {/* 复制邀请文案按钮 */}
                    <div className="mt-4">
                      <button
                        onClick={async () => {
                          try {
                            const inviteText = `邀请你加入 ${currentTeam.name}，团队编码是 ${currentTeam.code}，请在注册后点击加入团队输入此编码。`;
                            await navigator.clipboard.writeText(inviteText);
                            setInviteCopied(true);
                            setTimeout(() => setInviteCopied(false), 2000);
                          } catch (error) {
                            alert('复制失败，请手动复制');
                          }
                        }}
                        className={`px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                          inviteCopied 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                            : `${theme.bg.tertiary} ${theme.bg.hover} text-white`
                        }`}
                      >
                        {inviteCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            已复制
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            复制邀请文案
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`mb-6 p-6 ${theme.bg.secondary} border ${theme.border.primary} rounded-xl`}>
                    <div className={`text-center ${theme.text.muted} py-8`}>
                      {loadingTeams ? '加载中...' : '暂无团队信息'}
                    </div>
                  </div>
                )}

                {/* 成员列表表格 */}
                {currentTeam && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-sm font-semibold ${theme.text.secondary}`}>团队成员</h4>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${theme.text.muted}`}>{teamMembers.length} 位成员</span>
                        {canManageTeam && (
                          <button
                            onClick={() => setShowAddMember(true)}
                            className={`px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-1.5 transition-colors`}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            添加成员
                          </button>
                        )}
                      </div>
                    </div>

                    {loadingTeams ? (
                      <div className={`text-center py-12 ${theme.text.muted} text-sm`}>加载中...</div>
                    ) : (
                      <div className={`${theme.bg.secondary} border ${theme.border.primary} rounded-lg overflow-hidden`}>
                        {/* 表格头部 */}
                        <div className={`grid grid-cols-12 gap-4 px-4 py-3 ${theme.bg.primary} border-b ${theme.border.primary} text-xs font-semibold ${theme.text.muted} uppercase`}>
                          <div className="col-span-4">成员</div>
                          <div className="col-span-2">角色</div>
                          <div className="col-span-2">状态</div>
                          <div className="col-span-2">加入时间</div>
                          <div className="col-span-2 text-right">操作</div>
                        </div>

                        {/* 表格内容 */}
                        <div className="divide-y divide-zinc-800">
                          {teamMembers.length === 0 ? (
                            <div className={`px-4 py-8 text-center text-sm ${theme.text.muted}`}>
                              暂无成员
                            </div>
                          ) : (
                            teamMembers.map(member => (
                              <div key={member.id} className={`grid grid-cols-12 gap-4 px-4 py-4 items-center ${theme.bg.hover}/50 transition-colors`}>
                                {/* 成员信息 */}
                                <div className="col-span-4 flex items-center gap-3">
                                  {member.user?.avatar_url ? (
                                    <img 
                                      src={member.user.avatar_url} 
                                      alt={member.user.name} 
                                      className="w-10 h-10 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                                      {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium ${theme.text.secondary} truncate`}>
                                      {member.user?.name || '未知用户'}
                                    </div>
                                    <div className={`text-xs ${theme.text.muted} truncate`}>
                                      {member.user?.email || ''}
                                    </div>
                                  </div>
                                </div>

                                {/* 角色 */}
                                <div className="col-span-2">
                                  {userTeamRole === 'member' ? (
                                    <span className={`inline-block text-xs px-2 py-1 rounded ${
                                      member.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' :
                                      member.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                                      `${theme.bg.tertiary} ${theme.text.muted}`
                                    }`}>
                                      {member.role === 'super_admin' ? '超级管理员' :
                                       member.role === 'admin' ? '管理员' : '成员'}
                                    </span>
                                  ) : (
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as any)}
                                      className={`w-full ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-2 py-1.5 text-xs ${theme.text.primary} outline-none focus:border-indigo-500`}
                                    >
                                      <option value="member">普通成员</option>
                                      <option value="admin">管理员</option>
                                      <option value="super_admin">超级管理员</option>
                                    </select>
                                  )}
                                </div>

                                {/* 状态 */}
                                <div className="col-span-2">
                                  {userTeamRole === 'member' ? (
                                    <span className={`inline-block text-xs px-2 py-1 rounded ${
                                      member.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                      member.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {member.status === 'active' ? '活跃' : 
                                       member.status === 'pending' ? '待审核' : '已移除'}
                                    </span>
                                  ) : (
                                    <select
                                      value={member.status}
                                      onChange={async (e) => {
                                        if (!currentTeam) return;
                                        try {
                                          await teamsApi.updateMember(currentTeam.id, member.id, { 
                                            status: e.target.value as any 
                                          });
                                          await loadTeamMembers(currentTeam.id);
                                          alert('成员状态已更新');
                                        } catch (error: any) {
                                          const errorMsg = error?.response?.data?.message || error.message || '更新成员状态失败';
                                          alert(errorMsg);
                                        }
                                      }}
                                      className={`w-full ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-2 py-1.5 text-xs ${theme.text.primary} outline-none focus:border-indigo-500`}
                                    >
                                      <option value="active">活跃</option>
                                      <option value="pending">待审核</option>
                                      <option value="removed">已移除</option>
                                    </select>
                                  )}
                                </div>

                                {/* 加入时间 */}
                                <div className={`col-span-2 text-xs ${theme.text.muted}`}>
                                  {member.joined_at 
                                    ? new Date(member.joined_at).toLocaleDateString('zh-CN')
                                    : '-'}
                                </div>

                                {/* 操作 */}
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                  {userTeamRole !== 'member' && member.user_id !== currentUser?.id && (
                                    <button
                                      onClick={() => handleRemoveMember(member.id)}
                                      className={`p-2 ${theme.text.muted} hover:text-red-400 transition-colors`}
                                      title="移除成员"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  {member.user_id === currentUser?.id && (
                                    <span className={`text-xs ${theme.text.disabled}`}>（你）</span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 添加成员模态框 */}
                {showAddMember && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md ${theme.bg.secondary} border ${theme.border.primary}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${theme.text.primary}`}>添加团队成员</h3>
                        <button
                          onClick={() => {
                            setShowAddMember(false);
                            setAddMemberInput('');
                            setFoundUser(null);
                            setAddMemberRole('member');
                          }}
                          className={`${theme.text.muted} hover:${theme.text.primary}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium ${theme.text.secondary} mb-1`}>
                            邮箱或用户ID
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={addMemberInput}
                              onChange={(e) => setAddMemberInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !searchingUser) {
                                  handleSearchUser();
                                }
                              }}
                              placeholder="输入用户邮箱或用户ID"
                              className={`flex-1 ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-3 py-2 text-sm ${theme.text.primary} outline-none focus:border-indigo-500`}
                            />
                            <button
                              onClick={handleSearchUser}
                              disabled={searchingUser || !addMemberInput.trim()}
                              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm flex items-center gap-2 transition-colors`}
                            >
                              {searchingUser ? (
                                <>搜索中...</>
                              ) : (
                                <>
                                  <Search className="w-4 h-4" />
                                  搜索
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {foundUser && (
                          <div className={`p-3 ${theme.bg.tertiary} border ${theme.border.secondary} rounded`}>
                            <div className="flex items-center gap-3">
                              {foundUser.avatar_url ? (
                                <img
                                  src={foundUser.avatar_url}
                                  alt={foundUser.name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                                  {foundUser.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${theme.text.secondary}`}>
                                  {foundUser.name}
                                </div>
                                <div className={`text-xs ${theme.text.muted}`}>
                                  {foundUser.email}
                                </div>
                              </div>
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          </div>
                        )}

                        {foundUser && (
                          <div>
                            <label className={`block text-sm font-medium ${theme.text.secondary} mb-1`}>
                              角色
                            </label>
                            <select
                              value={addMemberRole}
                              onChange={(e) => setAddMemberRole(e.target.value as any)}
                              className={`w-full ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-3 py-2 text-sm ${theme.text.primary} outline-none focus:border-indigo-500`}
                            >
                              <option value="member">普通成员</option>
                              <option value="admin">管理员</option>
                              {userTeamRole === 'super_admin' && (
                                <option value="super_admin">超级管理员</option>
                              )}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4">
                          <button
                            onClick={handleAddMember}
                            disabled={!foundUser}
                            className={`flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm transition-colors`}
                          >
                            添加成员
                          </button>
                          <button
                            onClick={() => {
                              setShowAddMember(false);
                              setAddMemberInput('');
                              setFoundUser(null);
                              setAddMemberRole('member');
                            }}
                            className={`flex-1 px-4 py-2 ${theme.bg.tertiary} ${theme.text.secondary} rounded text-sm transition-colors`}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 项目分组标签页 */}
          {settingsActiveTab === 'groups' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className={`text-sm font-semibold ${theme.text.muted} mb-4`}>项目分组管理</h3>
                {!selectedTeamId && (
                  <div className={`mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs`}>
                    请先选择一个团队
                  </div>
                )}
                {!canManageProjectGroups && (
                  <div className={`mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs`}>
                    您没有权限管理项目分组
                  </div>
                )}
                
                {/* 创建项目分组 */}
                {canManageProjectGroups && selectedTeamId && (
                  <div className={`mb-4 p-4 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="项目分组名称"
                        className={`w-full ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-3 py-2 text-sm ${theme.text.primary} outline-none focus:border-indigo-500`}
                      />
                      <textarea
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="项目分组描述（可选）"
                        rows={2}
                        className={`w-full ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-3 py-2 text-sm ${theme.text.primary} outline-none focus:border-indigo-500`}
                      />
                      <button
                        onClick={handleCreateProjectGroup}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm flex items-center gap-2"
                      >
                        <PlusSquare className="w-4 h-4" />
                        创建项目分组
                      </button>
                    </div>
                  </div>
                )}

                {/* 项目分组列表 */}
                {loadingProjectGroups ? (
                  <div className={`text-center py-12 ${theme.text.muted} text-sm`}>加载中...</div>
                ) : projectGroupsError ? (
                  <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center`}>
                    {projectGroupsError}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {projectGroups.length === 0 ? (
                      <p className={`text-sm ${theme.text.muted} text-center py-8`}>暂无项目分组</p>
                    ) : (
                      projectGroups.map(group => (
                        <div key={group.id} className={`flex items-center gap-3 p-3 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}>
                          {editingGroup === group.id ? (
                            <>
                              <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateProjectGroupName(group.id, newGroupName);
                                  } else if (e.key === 'Escape') {
                                    setEditingGroup(null);
                                    setNewGroupName('');
                                  }
                                }}
                                autoFocus
                                className={`flex-1 ${theme.bg.tertiary} border border-indigo-500 rounded px-3 py-2 text-sm ${theme.text.primary} outline-none`}
                              />
                              <button
                                onClick={() => handleUpdateProjectGroupName(group.id, newGroupName)}
                                className="p-2 text-indigo-400 hover:text-indigo-300"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingGroup(null);
                                  setNewGroupName('');
                                }}
                                className={`p-2 ${theme.text.muted} ${theme.text.hover}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <FolderOpen className={`w-5 h-5 ${theme.text.muted}`} />
                              <div className="flex-1">
                                <div className={`text-sm ${theme.text.secondary}`}>{group.name}</div>
                                {group.description && (
                                  <div className={`text-xs ${theme.text.muted} mt-1`}>{group.description}</div>
                                )}
                              </div>
                              {canManageProjectGroups && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingGroup(group.id);
                                      setNewGroupName(group.name);
                                    }}
                                    className={`p-2 ${theme.text.muted} hover:text-indigo-400`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProjectGroup(group.id)}
                                    className={`p-2 ${theme.text.muted} hover:text-red-400`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 项目标签页 */}
          {settingsActiveTab === 'projects' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className={`text-sm font-semibold ${theme.text.muted} mb-4`}>管理项目</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className={`text-sm ${theme.text.muted} text-center py-8`}>暂无项目</p>
                  ) : (
                    projects.map(p => (
                      <div key={p.id} className={`p-4 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-medium ${theme.text.secondary}`}>{p.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            p.status === 'finalized' ? 'bg-orange-500/20 text-orange-400' :
                            p.status === 'delivered' ? 'bg-indigo-500/20 text-indigo-400' :
                            `${theme.bg.tertiary} ${theme.text.muted}`
                          }`}>
                            {p.status === 'active' ? '进行中' :
                             p.status === 'finalized' ? '已定版' :
                             p.status === 'delivered' ? '已交付' : '已归档'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className={`text-xs ${theme.text.muted}`}>组别:</label>
                          <select
                            value={projectGroupMap[p.id] || p.group}
                            onChange={(e) => handleUpdateProjectGroup(p.id, e.target.value)}
                            className={`flex-1 ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-3 py-2 text-sm ${theme.text.primary} outline-none focus:border-indigo-500`}
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

          {/* 标签标签页 */}
          {settingsActiveTab === 'tags' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className={`text-sm font-semibold ${theme.text.muted} mb-4`}>管理标签</h3>
                
                {/* Create New Tag */}
                <div className={`mb-4 p-4 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}>
                  <div className="flex gap-3">
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
                      className={`flex-1 ${theme.bg.tertiary} border ${theme.border.secondary} rounded px-4 py-2 text-sm ${theme.text.primary} placeholder-zinc-600 outline-none focus:border-indigo-500`}
                    />
                    <button
                      onClick={handleCreateTag}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors flex items-center gap-2"
                    >
                      <PlusSquare className="w-4 h-4" />
                      添加
                    </button>
                  </div>
                </div>

                {/* Tags List */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {tags.length === 0 ? (
                      <p className={`text-sm ${theme.text.muted} text-center py-8`}>暂无标签</p>
                  ) : (
                    tags.map(tag => (
                      <div key={tag.id} className={`flex items-center gap-3 p-3 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg`}>
                        <Tag className={`w-5 h-5 ${theme.text.muted}`} />
                        <span className={`flex-1 text-sm ${theme.text.secondary}`}>{tag.name}</span>
                        {tag.category && (
                          <span className={`text-xs ${theme.text.muted} px-2 py-1 ${theme.bg.tertiary} rounded`}>
                            {tag.category}
                          </span>
                        )}
                        <span className={`text-xs ${theme.text.muted}`}>
                          使用 {tag.usageCount || 0} 次
                        </span>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-2 text-zinc-500 hover:text-red-400"
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
        </div>
      </div>
    </div>
  );
};
