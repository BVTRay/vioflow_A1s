import { useState, useEffect, useCallback, useRef } from 'react';
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
  const deliveryCacheRef = useRef<Map<string, DeliveryData>>(new Map());
  const deliveryLoadingRef = useRef<Set<string>>(new Set());

  const mergeDeliveries = useCallback((items: DeliveryData[]) => {
    if (items.length === 0) return;
    setDeliveries((prev) => {
      const map = new Map<string, DeliveryData>();
      prev.forEach((d) => map.set(d.projectId, d));
      items.forEach((d) => map.set(d.projectId, d));
      return Array.from(map.values());
    });
  }, []);

  const loadDeliveriesForProjects = useCallback(
    async (projectIds: string[], teamId?: string) => {
      logger.log(`📦 [loadDeliveriesForProjects] 开始加载项目交付数据:`, projectIds);
      const targetTeamId = teamId || currentTeam?.id;
      if (!targetTeamId) {
        logger.log('⚠️ 没有当前团队，跳过交付加载');
        return;
      }

      // 过滤已缓存或正在加载的项目，避免重复请求
      const pending = projectIds.filter((id) => {
        const cached = deliveryCacheRef.current.has(id);
        const loading = deliveryLoadingRef.current.has(id);
        logger.log(`📦 [loadDeliveriesForProjects] 项目 ${id}: cached=${cached}, loading=${loading}`);
        return !cached && !loading;
      });

      if (pending.length === 0) {
        logger.log('📦 [loadDeliveriesForProjects] 所有项目都已缓存或正在加载，跳过');
        return;
      }

      logger.log(`📦 [loadDeliveriesForProjects] 需要加载 ${pending.length} 个项目的交付数据:`, pending);
      pending.forEach((id) => deliveryLoadingRef.current.add(id));

      try {
        const results = await Promise.all(
          pending.map(async (projectId) => {
            try {
              logger.log(`📦 [loadDeliveriesForProjects] 开始请求项目 ${projectId} 的交付数据`);
              const data = await deliveriesApi.getByProjectId(projectId);
              logger.log(`📦 [loadDeliveriesForProjects] 收到项目 ${projectId} 的交付数据:`, data);
              deliveryCacheRef.current.set(projectId, data);
              logger.log(`✅ 成功加载项目 ${projectId} 的交付数据`);
              return data;
            } catch (err: unknown) {
              const isRateLimit =
                err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'status' in err.response &&
                err.response.status === 429;

              if (isRateLimit) {
                logger.warn(`⚠️ 项目 ${projectId} 的交付数据请求被限流，跳过本次请求`);
              } else {
                logger.error(`❌ 加载项目 ${projectId} 的交付数据失败:`, err);
                // 即使失败，也创建一个默认的 delivery 对象，避免前端一直等待
                const defaultDelivery: DeliveryData = {
                  projectId,
                  hasCleanFeed: false,
                  hasMusicAuth: false,
                  hasMetadata: false,
                  hasTechReview: false,
                  hasCopyrightCheck: false,
                  hasScript: false,
                  hasCopyrightFiles: false,
                  hasMultiResolution: false,
                };
                deliveryCacheRef.current.set(projectId, defaultDelivery);
                logger.log(`📦 为项目 ${projectId} 创建默认交付数据`);
                return defaultDelivery;
              }
              return null;
            }
          })
        );

        const valid = results.filter(Boolean) as DeliveryData[];
        logger.log(`📦 [loadDeliveriesForProjects] 加载完成，有效数据: ${valid.length}/${results.length}`);
        if (valid.length > 0) {
          logger.log(`📦 [loadDeliveriesForProjects] 合并交付数据:`, valid);
          mergeDeliveries(valid);
        } else {
          logger.warn(`⚠️ 没有有效的交付数据被加载`);
        }
      } finally {
        pending.forEach((id) => deliveryLoadingRef.current.delete(id));
      }
    },
    [currentTeam?.id, mergeDeliveries]
  );

  const loadAllData = useCallback(
    async (teamId?: string, teamName?: string, includeDeliveries = false) => {
      // 如果没有提供参数，使用当前的团队
      const targetTeamId = teamId || currentTeam?.id;
      const targetTeamName = teamName || currentTeam?.name;

      // 如果没有当前团队，不加载数据
      if (!targetTeamId) {
        logger.log('⚠️ 没有当前团队，跳过数据加载');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        logger.log('🔄 开始加载数据，当前团队:', targetTeamId, targetTeamName);

        // 如果切换团队，清空交付缓存
        if (lastLoadedTeamIdRef.current && lastLoadedTeamIdRef.current !== targetTeamId) {
          deliveryCacheRef.current.clear();
          deliveryLoadingRef.current.clear();
          setDeliveries([]);
        }

        // 收集所有错误，统一处理
        const errors: string[] = [];

        const [projectsResult, videosResult, tagsData, notificationsData, recentData] = await Promise.all([
          projectsApi.getAll({ teamId: targetTeamId }).catch((err) => {
            const errorMsg = err?.response?.data?.message || err?.message || '加载项目失败';
            errors.push(`项目: ${errorMsg}`);
            logger.error('❌ 加载项目失败:', err);
            return [];
          }),
          videosApi.getAll({ teamId: targetTeamId }).catch((err) => {
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
          dashboardApi.getRecentOpened(10, targetTeamId).catch((err) => {
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

        if (includeDeliveries && projectsData.length > 0) {
          logger.log(`📦 按需加载 ${projectsData.length} 个项目的交付数据`);
          await loadDeliveriesForProjects(
            projectsData.map((p) => p.id),
            targetTeamId
          );
        }
      } catch (err: unknown) {
        const errorMessage =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String(err.response.data.message)
            : err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : '加载数据失败';
        setError(errorMessage);
        logger.error('Failed to load data:', err);
        toastManager.error(errorMessage, { duration: 5000 });
      } finally {
        setLoading(false);
      }
    },
    [currentTeam, loadDeliveriesForProjects]
  );

  // 使用 ref 来跟踪上次加载的团队 ID，避免重复加载
  const lastLoadedTeamIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentTeam?.id) {
      // 只在团队 ID 真正变化时才加载数据
      if (lastLoadedTeamIdRef.current !== currentTeam.id) {
        logger.log('🔄 useApiData: 检测到团队变化，开始加载数据');
        lastLoadedTeamIdRef.current = currentTeam.id;
        // 切换团队时清空交付缓存，避免不同团队数据串用
        deliveryCacheRef.current.clear();
        deliveryLoadingRef.current.clear();
        setDeliveries([]);
        loadAllData(currentTeam.id, currentTeam.name, false);
      } else {
        logger.log('✅ useApiData: 团队未变化，跳过重复加载');
      }
    } else {
      logger.log('⚠️ useApiData: 没有当前团队，等待团队加载...');
      lastLoadedTeamIdRef.current = null;
      deliveryCacheRef.current.clear();
      deliveryLoadingRef.current.clear();
      setDeliveries([]);
    }
  }, [currentTeam?.id, currentTeam?.name, loadAllData]);

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
    loadDeliveriesForProjects,
  };
};

