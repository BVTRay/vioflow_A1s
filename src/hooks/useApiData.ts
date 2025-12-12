import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';
import { videosApi } from '../api/videos';
import { tagsApi } from '../api/tags';
import { deliveriesApi } from '../api/deliveries';
import { notificationsApi } from '../api/notifications';
import { dashboardApi } from '../api/dashboard';
import { Project, Video, Tag, DeliveryData, Notification } from '../types';
import { useTeam } from '../contexts/TeamContext';

export const useApiData = () => {
  const { currentTeam } = useTeam();
  const [projects, setProjects] = useState<Project[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recentOpenedProjects, setRecentOpenedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = async () => {
    // 如果没有当前团队，不加载数据
    if (!currentTeam) {
      console.log('⚠️ 没有当前团队，跳过数据加载');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 开始加载数据，当前团队:', currentTeam.id, currentTeam.name);

      const [projectsData, videosData, tagsData, notificationsData, recentData] = await Promise.all([
        projectsApi.getAll({ teamId: currentTeam.id }).catch((err) => {
          console.error('❌ 加载项目失败:', err);
          return [];
        }),
        videosApi.getAll().catch((err) => {
          console.error('❌ 加载视频失败:', err);
          return [];
        }),
        tagsApi.getAll().catch((err) => {
          console.error('❌ 加载标签失败:', err);
          return [];
        }),
        notificationsApi.getAll().catch((err) => {
          console.error('❌ 加载通知失败:', err);
          return [];
        }),
        dashboardApi.getRecentOpened(10, currentTeam.id).catch((err) => {
          console.error('❌ 加载近期项目失败:', err);
          return [];
        }),
      ]);

      console.log('✅ 数据加载完成:', {
        projects: projectsData.length,
        videos: videosData.length,
        tags: tagsData.length,
        notifications: notificationsData.length,
        recent: recentData.length,
      });

      setProjects(projectsData);
      setVideos(videosData);
      setTags(tagsData);
      setNotifications(notificationsData);
      setRecentOpenedProjects(recentData);

      // 加载交付数据
      const deliveryPromises = projectsData.map(async (project) => {
        try {
          return await deliveriesApi.getByProjectId(project.id);
        } catch {
          return null;
        }
      });
      const deliveryResults = await Promise.all(deliveryPromises);
      setDeliveries(deliveryResults.filter(Boolean) as DeliveryData[]);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTeam?.id) {
      console.log('🔄 useApiData: 检测到团队变化，开始加载数据');
      loadAllData();
    } else {
      console.log('⚠️ useApiData: 没有当前团队，等待团队加载...');
    }
  }, [currentTeam?.id]); // 当团队切换时重新加载数据

  const refreshProjects = async () => {
    if (!currentTeam) return;
    const data = await projectsApi.getAll({ teamId: currentTeam.id });
    setProjects(data);
  };

  const refreshVideos = async (projectId?: string) => {
    const data = await videosApi.getAll(projectId ? { projectId } : undefined);
    setVideos(data);
  };

  const refreshTags = async () => {
    const data = await tagsApi.getAll();
    setTags(data);
  };

  const refreshNotifications = async () => {
    const data = await notificationsApi.getAll();
    setNotifications(data);
  };

  return {
    projects,
    videos,
    tags,
    deliveries,
    notifications,
    recentOpenedProjects,
    loading,
    error,
    refreshProjects,
    refreshVideos,
    refreshTags,
    refreshNotifications,
    loadAllData,
  };
};

