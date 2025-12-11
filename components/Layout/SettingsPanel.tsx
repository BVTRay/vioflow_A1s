
import React, { useState, useEffect } from 'react';
import { useStore } from '../../App';
import { useAuth } from '../../src/hooks/useAuth';
import { projectsApi } from '../../src/api/projects';
import { tagsApi } from '../../src/api/tags';
import { usersApi } from '../../src/api/users';
import { FolderOpen, FileVideo, Tag, Users, X, Trash2, Edit2, Save, PlusSquare } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const { projects, tags } = state;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Settings state
  const [settingsActiveTab, setSettingsActiveTab] = useState<'groups' | 'projects' | 'tags' | 'team'>('groups');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [projectGroupMap, setProjectGroupMap] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  // 获取所有组别
  const allGroups = Array.from(new Set(projects.map(p => p.group).filter(g => g && g !== '未分类')));

  const handleClose = () => {
    dispatch({ type: 'SET_MODULE', payload: 'dashboard' });
  };

  const handleDeleteGroup = (groupName: string) => {
    if (window.confirm(`确认删除组别"${groupName}"？该组下的项目将被移动到"未分类"组。`)) {
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
    projects.filter(p => p.group === oldName).forEach(p => {
      dispatch({
        type: 'UPDATE_PROJECT',
        payload: { ...p, group: newName }
      });
    });
    setEditingGroup(null);
    setNewGroupName('');
  };

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

  if (!isAdmin) {
    return (
      <div className="fixed left-[64px] top-14 bottom-0 right-0 flex items-center justify-center">
        <div className="text-center text-zinc-500">
          <p className="text-sm">您没有权限访问设置页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-[64px] top-14 bottom-0 right-0 bg-zinc-950">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">系统设置</h2>
            <p className="text-xs text-zinc-500 mt-0.5">管理员功能</p>
          </div>
          <button onClick={handleClose}>
            <X className="w-5 h-5 text-zinc-500 hover:text-zinc-200" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950">
          <button
            onClick={() => setSettingsActiveTab('groups')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              settingsActiveTab === 'groups' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            组别
          </button>
          <button
            onClick={() => setSettingsActiveTab('projects')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              settingsActiveTab === 'projects' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileVideo className="w-4 h-4 inline mr-2" />
            项目
          </button>
          <button
            onClick={() => setSettingsActiveTab('tags')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              settingsActiveTab === 'tags' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            标签
          </button>
          <button
            onClick={() => setSettingsActiveTab('team')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              settingsActiveTab === 'team' 
                ? 'text-indigo-400 border-b-2 border-indigo-400' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            团队成员
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Groups Tab */}
          {settingsActiveTab === 'groups' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">管理组别</h3>
                <div className="space-y-2">
                  {allGroups.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">暂无组别</p>
                  ) : (
                    allGroups.map(group => (
                      <div key={group} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
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
                              className="flex-1 bg-zinc-800 border border-indigo-500 rounded px-3 py-2 text-sm text-zinc-100 outline-none"
                            />
                            <button
                              onClick={() => handleRenameGroup(group, newGroupName)}
                              className="p-2 text-indigo-400 hover:text-indigo-300"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingGroup(null);
                                setNewGroupName('');
                              }}
                              className="p-2 text-zinc-500 hover:text-zinc-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <FolderOpen className="w-5 h-5 text-zinc-500" />
                            <span className="flex-1 text-base text-zinc-200">{group}</span>
                            <span className="text-sm text-zinc-500">
                              {projects.filter(p => p.group === group).length} 个项目
                            </span>
                            <button
                              onClick={() => {
                                setEditingGroup(group);
                                setNewGroupName(group);
                              }}
                              className="p-2 text-zinc-500 hover:text-indigo-400"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group)}
                              className="p-2 text-zinc-500 hover:text-red-400"
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
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">管理项目</h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-8">暂无项目</p>
                  ) : (
                    projects.map(p => (
                      <div key={p.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-base font-medium text-zinc-200">{p.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
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
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-zinc-500">组别:</label>
                          <select
                            value={projectGroupMap[p.id] || p.group}
                            onChange={(e) => handleUpdateProjectGroup(p.id, e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
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
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">管理标签</h3>
                
                {/* Create New Tag */}
                <div className="mb-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
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
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500"
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
                    <p className="text-sm text-zinc-500 text-center py-8">暂无标签</p>
                  ) : (
                    tags.map(tag => (
                      <div key={tag.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
                        <Tag className="w-5 h-5 text-zinc-500" />
                        <span className="flex-1 text-base text-zinc-200">{tag.name}</span>
                        {tag.category && (
                          <span className="text-xs text-zinc-500 px-2 py-1 bg-zinc-800 rounded">
                            {tag.category}
                          </span>
                        )}
                        <span className="text-sm text-zinc-500">
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

          {/* Team Members Tab */}
          {settingsActiveTab === 'team' && (
            <div className="space-y-4 max-w-4xl">
              <div>
                <h3 className="text-sm font-bold text-zinc-500 uppercase mb-4">团队成员管理</h3>
                
                {loadingTeamMembers ? (
                  <div className="text-center py-12 text-zinc-500 text-sm">加载中...</div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {teamMembers.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-8">暂无团队成员</p>
                    ) : (
                      teamMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                          {member.avatar_url ? (
                            <img 
                              src={member.avatar_url} 
                              alt={member.name}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-base">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-medium text-zinc-200 truncate">{member.name}</div>
                            <div className="text-sm text-zinc-500 truncate">{member.email}</div>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded ${
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
      </div>
    </div>
  );
};

