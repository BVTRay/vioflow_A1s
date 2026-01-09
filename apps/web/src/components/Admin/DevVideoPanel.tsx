import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileVideo, Edit2, Save, Trash2, X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { videosApi } from '../../api/videos';
import apiClient from '../../api/client';
import { isDevMode } from '../../utils/devMode';
import { useToast } from '../../hooks/useToast';

export const DevVideoPanel: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoData, setEditVideoData] = useState({
    name: '',
    baseName: '',
    version: 1,
    changeLog: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  useEffect(() => {
    console.log('📊 DevVideoPanel: 组件已挂载，开始加载视频');
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      console.log('📊 DevVideoPanel: 开始调用 getAllForAdmin API', { 
        isDevMode: isDevMode(),
        token: apiClient.getToken() ? '存在' : '不存在'
      });
      
      const data = await videosApi.getAllForAdmin(false);
      console.log('📊 DevVideoPanel: 成功获取视频数据', data.length, '个视频');
      setVideos(data);
    } catch (error: any) {
      console.error('📊 DevVideoPanel: 加载视频失败', error);
      const errorMsg = error?.response?.data?.message || error.message || '未知错误';
      toast.error('加载视频失败: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVideo = (video: any) => {
    setEditingVideoId(video.id);
    setEditVideoData({
      name: video.name || '',
      baseName: video.baseName || video.base_name || '',
      version: video.version || 1,
      changeLog: video.changeLog || video.change_log || '',
    });
  };

  const handleSaveVideoEdit = async () => {
    if (!editingVideoId) return;
    
    try {
      await videosApi.update(editingVideoId, {
        name: editVideoData.name,
        baseName: editVideoData.baseName,
        version: editVideoData.version,
        changeLog: editVideoData.changeLog,
      });
      toast.success('视频信息已更新');
      setEditingVideoId(null);
      await loadVideos();
    } catch (error: any) {
      console.error('更新视频失败:', error);
      const errorMsg = error?.response?.data?.message || error.message || '未知错误';
      toast.error('更新视频失败: ' + errorMsg);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      await videosApi.delete(videoId, false);
      toast.success('视频已删除');
      await loadVideos();
    } catch (error: any) {
      console.error('删除视频失败:', error);
      const errorMsg = error?.response?.data?.message || error.message || '未知错误';
      toast.error('删除视频失败: ' + errorMsg);
    } finally {
      setDeletingVideoId(null);
      setShowDeleteConfirm(null);
    }
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  const handleNavigateToUsers = () => {
    navigate('/admin/users');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回用户管理</span>
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <h1 className="text-xl font-medium text-gray-900">视频文件管理</h1>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={handleNavigateToUsers}
              className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              用户管理
            </button>
            <button
              onClick={() => navigate('/admin/videos')}
              className="px-4 py-3 text-sm font-medium text-gray-900 border-b-2 border-indigo-600 flex items-center gap-2"
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
              <h2 className="text-lg font-semibold text-gray-900">所有视频文件</h2>
              <p className="text-sm text-gray-500 mt-1">查看和管理所有视频文件，包括项目、分组、团队和上传人员信息</p>
            </div>
            <button
              onClick={loadVideos}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>刷新</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileVideo className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无视频</p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        视频名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        版本
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        项目
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        分组
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        团队
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        上传人员
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        上传时间
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {videos.map((video: any) => {
                      const project = video.project || {};
                      const team = project.team || {};
                      const uploader = video.uploader || {};
                      const isEditing = editingVideoId === video.id;
                      
                      return (
                        <tr key={video.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editVideoData.name}
                                onChange={(e) => setEditVideoData({...editVideoData, name: e.target.value})}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            ) : (
                              <div className="text-sm text-gray-900 break-words max-w-[200px]" title={video.name}>
                                {video.name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editVideoData.version}
                                onChange={(e) => setEditVideoData({...editVideoData, version: parseInt(e.target.value) || 1})}
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                              />
                            ) : (
                              <span className="text-xs text-gray-500">v{video.version}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 break-words max-w-[150px]" title={project.name}>
                            {project.name || '未知项目'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 break-words max-w-[120px]" title={project.group}>
                            {project.group || '未分类'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 break-words max-w-[120px]" title={team.name}>
                            {team.name || '未知团队'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 break-words max-w-[150px]" title={uploader.name || uploader.email}>
                            {uploader.name || uploader.email || '未知用户'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {video.uploadTime ? new Date(video.uploadTime).toLocaleString('zh-CN') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSaveVideoEdit}
                                    className="text-green-600 hover:text-green-900 whitespace-nowrap flex items-center gap-1"
                                  >
                                    <Save className="w-4 h-4" />
                                    保存
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingVideoId(null);
                                      setEditVideoData({ name: '', baseName: '', version: 1, changeLog: '' });
                                    }}
                                    className="text-gray-600 hover:text-gray-900 whitespace-nowrap flex items-center gap-1"
                                  >
                                    <X className="w-4 h-4" />
                                    取消
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditVideo(video)}
                                    className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap flex items-center gap-1"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(video.id)}
                                    className="text-red-600 hover:text-red-900 whitespace-nowrap flex items-center gap-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    删除
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold">确认删除视频</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">此操作不可撤销</p>
                  <p className="text-xs opacity-80">删除视频后，视频将被放入回收站，保留30天后自动清理。</p>
                </div>
              </div>
              {(() => {
                const videoToDelete = videos.find((v: any) => v.id === showDeleteConfirm);
                if (videoToDelete) {
                  return (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">视频名称：</p>
                      <p className="text-sm font-medium text-gray-900">{videoToDelete.name}</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex gap-2 pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteVideo(showDeleteConfirm)}
                disabled={deletingVideoId === showDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingVideoId === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

