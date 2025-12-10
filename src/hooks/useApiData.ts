import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';
import { videosApi } from '../api/videos';
import { tagsApi } from '../api/tags';
import { deliveriesApi } from '../api/deliveries';
import { notificationsApi } from '../api/notifications';
import { dashboardApi } from '../api/dashboard';
import { Project, Video, Tag, DeliveryData, Notification } from '../types';

export const useApiData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [recentOpenedProjects, setRecentOpenedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectsData, videosData, tagsData, notificationsData, recentData] = await Promise.all([
        projectsApi.getAll().catch(() => []),
        videosApi.getAll().catch(() => []),
        tagsApi.getAll().catch(() => []),
        notificationsApi.getAll().catch(() => []),
        dashboardApi.getRecentOpened(10).catch(() => []),
      ]);

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
    loadAllData();
  }, []);

  const refreshProjects = async () => {
    const data = await projectsApi.getAll();
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

