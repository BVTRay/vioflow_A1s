import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api/projects';
import { videosApi } from '../api/videos';
import { tagsApi } from '../api/tags';
import { deliveriesApi } from '../api/deliveries';
import { notificationsApi } from '../api/notifications';
import { dashboardApi } from '../api/dashboard';
import { Project, Video, Tag, DeliveryData, Notification as AppNotification } from '../types';
import { useTeam } from '../contexts/TeamContext';
import { toastManager } from './useToast';
import { logger } from '../utils/logger';

// API 响应类型定义
interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

type ApiResponse<T> = T[] | PaginatedResponse<T>;

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

  const loadAllData = useCallback(async () => {
    // 如果没有当前团队，不加载数据
    if (!currentTeam) {
      logger.log('⚠️ 没有当前团队，跳过数据加载');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.log('🔄 开始加载数据，当前团队:', currentTeam.id, currentTeam.name);

      // 收集所有错误，统一处理
      const errors: string[] = [];

      const [projectsResult, videosResult, tagsData, notificationsData, recentData] = await Promise.all([
        projectsApi.getAll({ teamId: currentTeam.id }).catch((err) => {
          const errorMsg = err?.response?.data?.message || err?.message || '加载项目失败';
          errors.push(`项目: ${errorMsg}`);
          logger.error('❌ 加载项目失败:', err);
          return [];
        }),
        videosApi.getAll({ teamId: currentTeam.id }).catch((err) => {
          const errorMsg = err?.response?.data?.message || err?.message || '加载视频失败';
          errors.push(`视频: ${errorMsg}`);
          logger.error('❌ 加载视频失败:', err);
          return [];
        }),
        tagsApi.getAll().catch((err) => {
          const errorMsg = err?.response?.data?.message || err?.message || '加载标签失败';
          errors.push(`标签: ${errorMsg}`);
          logger.error('❌ 加载标签失败:', err);
          return [];
        }),
        notificationsApi.getAll().catch((err) => {
          const errorMsg = err?.response?.data?.message || err?.message || '加载通知失败';
          errors.push(`通知: ${errorMsg}`);
          logger.error('❌ 加载通知失败:', err);
          return [];
        }),
        dashboardApi.getRecentOpened(10, currentTeam.id).catch((err) => {
          const errorMsg = err?.response?.data?.message || err?.message || '加载近期项目失败';
          errors.push(`近期项目: ${errorMsg}`);
          logger.error('❌ 加载近期项目失败:', err);
          return [];
        }),
      ]);

      // 如果有错误，向用户显示
      if (errors.length > 0) {
        const errorMessage = `部分数据加载失败: ${errors.join('; ')}`;
        setError(errorMessage);
        toastManager.warning(errorMessage, { duration: 5000 });
      }

      // 处理分页格式的响应
      const projectsData: Project[] = Array.isArray(projectsResult) 
        ? projectsResult 
        : (projectsResult as PaginatedResponse<Project>)?.data || [];
      const videosData: Video[] = Array.isArray(videosResult) 
        ? videosResult 
        : (videosResult as PaginatedResponse<Video>)?.data || [];

      logger.log('✅ 数据加载完成:', {
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

      // 加载交付数据 - 使用分批处理避免触发限流
      // 分批处理：每次处理3个请求，避免同时发送过多请求
      const BATCH_SIZE = 3;
      const DELAY_BETWEEN_BATCHES = 200; // 每批之间延迟200ms
      const deliveryResults: (DeliveryData | null)[] = [];

      for (let i = 0; i < projectsData.length; i += BATCH_SIZE) {
        const batch = projectsData.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (project) => {
          let retries = 3; // 最多重试3次
          while (retries > 0) {
        try {
          return await deliveriesApi.getByProjectId(project.id);
            } catch (err: unknown) {
              const isRateLimit = 
                err && typeof err === 'object' && 
                'response' in err && 
                err.response && 
                typeof err.response === 'object' && 
                'status' in err.response &&
                err.response.status === 429;

              if (isRateLimit && retries > 1) {
                // 如果是429错误且还有重试次数，等待后重试
                const waitTime = (4 - retries) * 500; // 递增等待时间：500ms, 1000ms, 1500ms
                logger.warn(`⚠️ 项目 ${project.id} 的交付数据请求被限流，${waitTime}ms 后重试...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                retries--;
                continue;
              }

              // 其他错误或重试次数用完，记录错误并返回null
              logger.error(`加载项目 ${project.id} 的交付数据失败:`, err);
              return null;
            }
          }
          return null;
        });

        const batchResults = await Promise.all(batchPromises);
        deliveryResults.push(...batchResults);

        // 如果不是最后一批，等待一段时间再处理下一批
        if (i + BATCH_SIZE < projectsData.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      setDeliveries(deliveryResults.filter(Boolean) as DeliveryData[]);
    } catch (err: unknown) {
      const errorMessage = 
        (err && typeof err === 'object' && 'response' in err && 
         err.response && typeof err.response === 'object' && 'data' in err.response &&
         err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
         ? String(err.response.data.message)
         : (err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : '加载数据失败'));
      setError(errorMessage);
      logger.error('Failed to load data:', err);
      toastManager.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);

  useEffect(() => {
    if (currentTeam?.id) {
      logger.log('🔄 useApiData: 检测到团队变化，开始加载数据');
      loadAllData();
    } else {
      logger.log('⚠️ useApiData: 没有当前团队，等待团队加载...');
    }
  }, [currentTeam?.id, loadAllData]); // 添加 loadAllData 到依赖数组

  const refreshProjects = async () => {
    if (!currentTeam) return;
    const result = await projectsApi.getAll({ teamId: currentTeam.id });
    const data: Project[] = Array.isArray(result) 
      ? result 
      : (result as PaginatedResponse<Project>)?.data || [];
    setProjects(data);
  };

  const refreshVideos = async (projectId?: string) => {
    if (!currentTeam) return;
    const result = await videosApi.getAll(
      projectId ? { projectId, teamId: currentTeam.id } : { teamId: currentTeam.id }
    );
    const data: Video[] = Array.isArray(result) 
      ? result 
      : (result as PaginatedResponse<Video>)?.data || [];
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

