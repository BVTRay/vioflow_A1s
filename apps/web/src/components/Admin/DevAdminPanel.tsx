import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileVideo } from 'lucide-react';
import { devAdminApi, DevAdminUser, UpdateUserDto, CreateUserDto } from '../../api/dev-admin';
import apiClient from '../../api/client';
import { isDevMode } from '../../utils/devMode';

export const DevAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<DevAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<DevAdminUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserDto>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserDto>({
    email: '',
    password: '',
    name: '',
    role: 'member',
  });

  useEffect(() => {
    console.log('📊 DevAdminPanel: 组件已挂载，开始加载用户');
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('📊 DevAdminPanel: 开始调用 getAllUsers API', { 
        isDevMode: isDevMode(),
        token: apiClient.getToken() ? '存在' : '不存在'
      });
      
      const data = await devAdminApi.getAllUsers();
      console.log('📊 DevAdminPanel: 成功获取用户数据', data.length, '个用户');
      setUsers(data);
    } catch (error: any) {
      console.error('📊 DevAdminPanel: 加载用户失败', error);
      if (error?.response?.status === 403) {
        console.error('📊 DevAdminPanel: 403 权限不足');
        if (isDevMode()) {
          alert('开发者模式：API调用失败。\n\n请确保：\n1. 已使用真实账号登录（开发者模式会自动登录admin账号）\n2. 后端服务正常运行');
        } else {
          alert('权限不足：需要 DEV_SUPER_ADMIN 角色或开发者模式');
        }
        navigate('/');
      } else {
        const errorMsg = error?.response?.data?.message || error.message || '未知错误';
        console.error('📊 DevAdminPanel: 错误详情', {
          status: error?.response?.status,
          message: errorMsg,
          error
        });
        alert('加载用户失败: ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      await devAdminApi.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      setEditForm({});
      loadUsers();
      alert('用户更新成功');
    } catch (error: any) {
      alert('更新失败: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('确定要将密码重置为 123456 吗？')) return;
    try {
      await devAdminApi.resetPassword(id);
      alert('密码已重置为 123456');
    } catch (error: any) {
      alert('重置失败: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm('确定要软删除这个用户吗？')) return;
    try {
      await devAdminApi.softDeleteUser(id);
      loadUsers();
      alert('用户已软删除');
    } catch (error: any) {
      alert('删除失败: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleImpersonate = async (id: string) => {
    if (!confirm('确定要以该用户身份登录吗？当前会话将被替换。')) return;
    try {
      const result = await devAdminApi.impersonateUser(id);
      // 设置新的token
      apiClient.setToken(result.access_token);
      // 重定向到主应用首页
      window.location.href = '/';
    } catch (error: any) {
      alert('模拟登录失败: ' + (error?.response?.data?.message || error.message));
    }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.name) {
      alert('请填写所有必填字段');
      return;
    }
    try {
      await devAdminApi.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        name: '',
        role: 'member',
      });
      loadUsers();
      alert('用户创建成功');
    } catch (error: any) {
      alert('创建失败: ' + (error?.response?.data?.message || error.message));
    }
  };

  const startEdit = (user: DevAdminUser) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      phone: user.phone,
      is_active: user.status === 'Active',
    });
  };

  const handleBack = () => {
    // 设置标记，表示从开发者后台返回
    sessionStorage.setItem('from_dev_admin', 'true');
    // 恢复ray的token（如果从开发者后台返回）
    const rayToken = localStorage.getItem('ray_user_token');
    if (rayToken && isDevMode()) {
      apiClient.setToken(rayToken);
      console.log('🔧 开发者后台：已恢复ray的token，返回主应用');
    }
    // 跳转到主应用
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回应用</span>
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <h1 className="text-xl font-medium text-gray-900">纷呈开发者后台</h1>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-3 text-sm font-medium text-gray-900 border-b-2 border-indigo-600"
            >
              用户管理
            </button>
            <button
              onClick={() => navigate('/admin/videos')}
              className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2"
            >
              <FileVideo className="w-4 h-4" />
              视频管理
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
              <p className="text-sm text-gray-500 mt-1">管理所有用户信息和权限调试</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>添加用户</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        UserID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Username
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Team Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[280px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 break-all" title={user.id}>
                          {user.id.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 break-words" title={user.username}>
                          {user.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 break-words" title={user.email}>
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 break-words" title={user.phone || ''}>
                          {user.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 break-words" title={user.teamName || ''}>
                          {user.teamName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 break-words inline-block max-w-full" title={user.role}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => startEdit(user)}
                              className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="text-yellow-600 hover:text-yellow-900 whitespace-nowrap"
                            >
                              重置密码
                            </button>
                            <button
                              onClick={() => handleImpersonate(user.id)}
                              className="text-green-600 hover:text-green-900 whitespace-nowrap"
                            >
                              模拟登录
                            </button>
                            <button
                              onClick={() => handleSoftDelete(user.id)}
                              className="text-red-600 hover:text-red-900 whitespace-nowrap"
                            >
                              软删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">编辑用户</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editForm.is_active || false}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">激活状态</label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm({});
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">添加用户</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="用户名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="至少6个字符"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                  <option value="sales">Sales</option>
                  <option value="DEV_SUPER_ADMIN">Dev Super Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      email: '',
                      password: '',
                      name: '',
                      role: 'member',
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

