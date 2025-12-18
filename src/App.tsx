
import React, { useReducer, createContext, useContext, useEffect, useRef } from 'react';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { RetrievalPanel } from './components/Layout/RetrievalPanel';
import { Workbench } from './components/Layout/Workbench';
import { MainBrowser } from './components/Layout/MainBrowser';
import { ReviewOverlay } from './components/Layout/ReviewOverlay';
import { Dashboard } from './components/Layout/Dashboard';
import { SettingsPanel } from './components/Layout/SettingsPanel';
import { ShareModule } from './components/Layout/ShareModule';
import { Drawer } from './components/UI/Drawer';
import { AppState, Action, Project, Video, DeliveryData, Notification as AppNotification } from './types';
import { FileUp, CheckCircle, BellRing, Loader2, X } from 'lucide-react';
import { useApiData } from './hooks/useApiData';
import { TeamProvider } from './contexts/TeamContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useThemeClasses } from './hooks/useThemeClasses';
import { uploadAbortControllers } from './utils/uploadManager';
import { ToastContainer } from './components/UI/Toast';
import { toastManager } from './hooks/useToast';
import { Toast } from './components/UI/Toast';

// --- MOCK DATA ---
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: '2412_Nike_AirMax_Holiday', client: 'Nike', lead: 'Sarah D.', postLead: 'Mike', group: '广告片', status: 'active', createdDate: '2024-12-01', team: ['Sarah D.', 'Mike', 'Alex'] },
  { id: 'p2', name: '2501_Spotify_Wrapped_Asia', client: 'Spotify', lead: 'Alex', postLead: 'Jen', group: '社交媒体', status: 'active', createdDate: '2025-01-10', team: ['Alex', 'Jen'] },
  { id: 'p3', name: '2411_Netflix_Docu_S1', client: 'Netflix', lead: 'Jessica', postLead: 'Tom', group: '长视频', status: 'finalized', createdDate: '2024-11-05', team: ['Jessica', 'Tom', 'Sarah D.'] },
  { id: 'p4', name: '2410_Porsche_911_Launch', client: 'Porsche', lead: 'Tom', postLead: 'Sarah', group: '广告片', status: 'delivered', createdDate: '2024-10-20', team: ['Tom', 'Sarah'] },
];

const INITIAL_VIDEOS: Video[] = [
  { id: 'v1', projectId: 'p1', name: 'v4_Nike_AirMax.mp4', type: 'video', url: '', version: 4, uploadTime: '2小时前', isCaseFile: false, isMainDelivery: false, size: '2.4 GB', duration: '00:01:30', resolution: '3840x2160', status: 'initial', changeLog: '调整了结尾Logo的入场动画' },
  { id: 'v2', projectId: 'p1', name: 'v3_Nike_AirMax.mp4', type: 'video', url: '', version: 3, uploadTime: '昨天', isCaseFile: false, isMainDelivery: false, size: '2.4 GB', duration: '00:01:30', resolution: '3840x2160', status: 'annotated', changeLog: '根据客户意见修改了调色' },
  { id: 'v3', projectId: 'p4', name: 'v12_Porsche_Launch_Master.mov', type: 'video', url: '', version: 12, uploadTime: '2周前', isCaseFile: true, isMainDelivery: true, size: '42 GB', duration: '00:00:60', resolution: '4096x2160', status: 'approved', changeLog: '最终定版', tags: ['三维制作'] },
  { id: 'v4', projectId: 'p3', name: 'v8_Netflix_Ep1_Lock.mp4', type: 'video', url: '', version: 8, uploadTime: '3天前', isCaseFile: false, isMainDelivery: false, size: '1.8 GB', duration: '00:45:00', resolution: '1920x1080', status: 'initial', changeLog: '粗剪定版' },
];

const INITIAL_DELIVERIES: DeliveryData[] = [
  { projectId: 'p3', hasCleanFeed: true, hasMusicAuth: false, hasMetadata: true, hasTechReview: false, hasCopyrightCheck: false, hasScript: false, hasCopyrightFiles: false, hasMultiResolution: false }, // Pending
  { projectId: 'p4', hasCleanFeed: true, hasMusicAuth: true, hasMetadata: true, hasTechReview: true, hasCopyrightCheck: true, hasScript: true, hasCopyrightFiles: true, hasMultiResolution: true, sentDate: '2024-10-25', deliveryTitle: 'Porsche 911 Launch Campaign', deliveryDescription: '最终交付版本，包含所有素材和说明文档。', deliveryPackages: [
    { id: 'dp1', projectId: 'p4', title: 'Porsche 911 Launch Campaign', description: '最终交付版本，包含所有素材和说明文档。', link: 'https://vioflow.io/delivery/dp1', createdAt: '2024-10-25', downloadCount: 3, isActive: true }
  ] }, // Delivered
];

const initialState: AppState = {
  activeModule: 'dashboard',
  projects: [],
  videos: [],
  deliveries: [],
  tags: [],
  cart: [],
  uploadQueue: [],
  notifications: [],
  selectedProjectId: null,
  selectedVideoId: null,
  isReviewMode: false,
  showWorkbench: false,
  activeDrawer: 'none',
  searchTerm: '',
  activeTag: '全部',
  isRetrievalPanelVisible: true,
  isTagPanelExpanded: false,
  selectedGroupTag: null,
  selectedGroupTags: [],
  isTagMultiSelectMode: false,
  browserViewMode: 'grid',
  browserCardSize: 'medium',
  reviewViewMode: 'files',
  deliveryViewMode: 'files',
  selectedDeliveryFiles: [],
  showcaseViewMode: 'files',
  filteredShowcaseVideos: [],
  showcasePackages: [],
  recentOpenedProjects: [],
  showcaseSelection: [],
  workbenchActionType: null,
  workbenchCreateMode: null,
  workbenchEditProjectId: null,
  pendingProjectGroup: null,
  shouldTriggerFileSelect: false,
  quickUploadMode: false,
  workbenchView: 'none',
  workbenchContext: {},
  selectedShareProjects: [],
  shareMultiSelectMode: false,
  selectedShareProjectId: null,
  settingsActiveTab: 'teams',
  showVersionHistory: false,
  versionHistoryViewMode: 'grid',
  versionHistoryBaseName: null,
};

// --- REDUCER ---
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_MODULE':
      return { 
        ...state, 
        activeModule: action.payload,
        selectedProjectId: null, 
        selectedVideoId: null,
        searchTerm: '',
        showWorkbench: false, // Settings panel is separate, don't open workbench
        workbenchActionType: null, // Clear workbench action type when switching modules
        workbenchView: 'none',
        workbenchContext: {},
        showVersionHistory: false,
        versionHistoryBaseName: null,
        workbenchEditProjectId: null,
        workbenchCreateMode: null
      };
    case 'SELECT_PROJECT':
      return { 
        ...state, 
        selectedProjectId: action.payload, 
        selectedVideoId: null,
        // 不再自动打开操作台，只有点击新建/编辑按钮时才打开
        showWorkbench: false,
        workbenchView: 'none',
        workbenchContext: {},
        showVersionHistory: false,
        versionHistoryBaseName: null,
        workbenchEditProjectId: null,
        workbenchCreateMode: null
      };
    case 'SELECT_VIDEO':
      return { 
        ...state, 
        selectedVideoId: action.payload, 
        // 不再自动打开操作台，只有点击新建/编辑按钮时才打开
        showWorkbench: false,
        workbenchView: 'none',
        workbenchContext: {},
        showVersionHistory: false,
        versionHistoryBaseName: null,
        workbenchEditProjectId: null,
        workbenchCreateMode: null
      };
    case 'ADD_PROJECT':
      return { 
        ...state, 
        projects: [action.payload, ...state.projects], 
        selectedProjectId: action.payload.id,
        showWorkbench: true // Auto open for new project
      };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'ADD_VIDEO':
      return { ...state, videos: [action.payload, ...state.videos] };
    case 'FINALIZE_PROJECT': {
      const updatedProjects = state.projects.map(p => 
        p.id === action.payload ? { ...p, status: 'finalized' as const } : p
      );
      const deliveryExists = state.deliveries.find(d => d.projectId === action.payload);
      const newDeliveries = deliveryExists 
        ? state.deliveries 
        : [...state.deliveries, { projectId: action.payload, hasCleanFeed: false, hasMusicAuth: false, hasMetadata: false, hasTechReview: false, hasCopyrightCheck: false, hasScript: false, hasCopyrightFiles: false, hasMultiResolution: false }];
      
      return { ...state, projects: updatedProjects, deliveries: newDeliveries, selectedProjectId: null };
    }
    case 'COMPLETE_DELIVERY': {
      const updatedProjects = state.projects.map(p => 
        p.id === action.payload ? { ...p, status: 'delivered' as const } : p
      );
      return { ...state, projects: updatedProjects, selectedProjectId: null };
    }
    case 'UPDATE_DELIVERY_CHECKLIST': {
      return {
        ...state,
        deliveries: state.deliveries.map(d => 
          d.projectId === action.payload.projectId ? { ...d, [action.payload.field]: action.payload.value } : d
        )
      };
    }
    case 'TOGGLE_CASE_FILE':
      return {
        ...state,
        videos: state.videos.map(v => v.id === action.payload ? { ...v, isCaseFile: !v.isCaseFile } : v)
      };
    case 'TOGGLE_MAIN_DELIVERY':
      return {
        ...state,
        videos: state.videos.map(v => v.id === action.payload ? { ...v, isMainDelivery: !v.isMainDelivery, isCaseFile: true } : v)
      };
    case 'UPDATE_VIDEO_TAGS':
      return {
        ...state,
        videos: state.videos.map(v => v.id === action.payload.videoId ? { ...v, tags: action.payload.tags } : v)
      };
    case 'UPDATE_DELIVERY_NOTE':
      return {
        ...state,
        deliveries: state.deliveries.map(d => 
          d.projectId === action.payload.projectId ? { ...d, deliveryNote: action.payload.note } : d
        )
      };
    case 'UPDATE_DELIVERY_TITLE':
      return {
        ...state,
        deliveries: state.deliveries.map(d => 
          d.projectId === action.payload.projectId ? { ...d, deliveryTitle: action.payload.title } : d
        )
      };
    case 'UPDATE_DELIVERY_DESCRIPTION':
      return {
        ...state,
        deliveries: state.deliveries.map(d => 
          d.projectId === action.payload.projectId ? { ...d, deliveryDescription: action.payload.description } : d
        )
      };
    case 'GENERATE_DELIVERY_LINK': {
      const delivery = state.deliveries.find(d => d.projectId === action.payload.projectId);
      if (!delivery || !delivery.deliveryTitle) return state;
      
      const newPackage = {
        id: `dp${Date.now()}`,
        projectId: action.payload.projectId,
        title: delivery.deliveryTitle,
        description: delivery.deliveryDescription || '',
        link: `https://vioflow.io/delivery/${Date.now()}`,
        createdAt: new Date().toISOString(),
        downloadCount: 0,
        isActive: true
      };
      
      return {
        ...state,
        deliveries: state.deliveries.map(d => 
          d.projectId === action.payload.projectId 
            ? { ...d, deliveryPackages: [...(d.deliveryPackages || []), newPackage] }
            : d
        ),
        selectedDeliveryFiles: [] // 清空选择
      };
    }
    case 'TOGGLE_DELIVERY_FILE_SELECTION':
      return {
        ...state,
        selectedDeliveryFiles: state.selectedDeliveryFiles.includes(action.payload)
          ? state.selectedDeliveryFiles.filter(id => id !== action.payload)
          : [...state.selectedDeliveryFiles, action.payload]
      };
    case 'CLEAR_DELIVERY_FILE_SELECTION':
      return { ...state, selectedDeliveryFiles: [] };
    case 'ADD_CUSTOM_TAG':
      // 这个可以存储到系统标签列表中，暂时只返回state
      return state;
    case 'TOGGLE_DELIVERY_PACKAGE':
      return {
        ...state,
        deliveries: state.deliveries.map(d => ({
          ...d,
          deliveryPackages: d.deliveryPackages?.map(p => 
            p.id === action.payload.packageId ? { ...p, isActive: action.payload.isActive } : p
          ) || []
        }))
      };
    case 'SET_REVIEW_VIEW_MODE':
      return { ...state, reviewViewMode: action.payload };
    case 'SET_DELIVERY_VIEW_MODE':
      return { ...state, deliveryViewMode: action.payload };
    // --- SHOWCASE ---
    case 'SET_SHOWCASE_VIEW_MODE':
      return { ...state, showcaseViewMode: action.payload };
    case 'SET_FILTERED_SHOWCASE_VIDEOS':
      return { ...state, filteredShowcaseVideos: action.payload };
    case 'ADD_TO_SHOWCASE_BROWSER':
      return {
        ...state,
        filteredShowcaseVideos: state.filteredShowcaseVideos.includes(action.payload)
          ? state.filteredShowcaseVideos
          : [...state.filteredShowcaseVideos, action.payload]
      };
    case 'CLEAR_SHOWCASE_BROWSER':
      return { ...state, filteredShowcaseVideos: [] };
    case 'GENERATE_SHOWCASE_PACKAGE': {
      const newPackage = {
        id: `sp${Date.now()}`,
        title: action.payload.title,
        description: action.payload.description,
        mode: action.payload.mode,
        clientName: action.payload.clientName,
        link: `https://vioflow.io/showcase/${Date.now()}`,
        createdAt: new Date().toISOString(),
        viewCount: 0,
        isActive: true,
        items: state.cart.map((videoId, index) => ({
          videoId,
          order: index,
          description: ''
        }))
      };
      return {
        ...state,
        showcasePackages: [...state.showcasePackages, newPackage],
        cart: [] // 清空操作台
      };
    }
    case 'TOGGLE_SHOWCASE_PACKAGE':
      return {
        ...state,
        showcasePackages: state.showcasePackages.map(p => 
          p.id === action.payload.packageId ? { ...p, isActive: action.payload.isActive } : p
        )
      };
    case 'UPDATE_VIDEO_STATUS':
      return {
        ...state,
        videos: state.videos.map(v => v.id === action.payload.videoId ? { ...v, status: action.payload.status } : v)
      };
    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(v => v.id === action.payload.id ? action.payload : v)
      };
    case 'TOGGLE_CART_ITEM':
      const exists = state.cart.includes(action.payload);
      return {
        ...state,
        cart: exists ? state.cart.filter(id => id !== action.payload) : [...state.cart, action.payload]
      };
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload };
    case 'SET_TAG':
      return { ...state, activeTag: action.payload };
    case 'TOGGLE_TAG_PANEL':
      // 当关闭标签面板时，清除选中状态
      const willBeExpanded = !state.isTagPanelExpanded;
      return { 
        ...state, 
        isTagPanelExpanded: willBeExpanded,
        selectedGroupTag: willBeExpanded ? state.selectedGroupTag : null, // 关闭时清除选中状态
        selectedGroupTags: willBeExpanded ? state.selectedGroupTags : [] // 关闭时清除多选状态
      };
    case 'SET_GROUP_TAG':
      return { ...state, selectedGroupTag: action.payload, selectedGroupTags: [] }; // 单选时清空多选
    case 'TOGGLE_TAG_MULTI_SELECT_MODE':
      return { 
        ...state, 
        isTagMultiSelectMode: !state.isTagMultiSelectMode,
        selectedGroupTag: null, // 切换模式时清空单选
        selectedGroupTags: [] // 切换模式时清空多选
      };
    case 'TOGGLE_GROUP_TAG': {
      const tagName = action.payload;
      const isSelected = state.selectedGroupTags.includes(tagName);
      return {
        ...state,
        selectedGroupTags: isSelected
          ? state.selectedGroupTags.filter(t => t !== tagName)
          : [...state.selectedGroupTags, tagName],
        selectedGroupTag: null // 多选时清空单选
      };
    }
    case 'CLEAR_GROUP_TAGS':
      return { ...state, selectedGroupTags: [] };
    case 'TOGGLE_DRAWER':
      return { ...state, activeDrawer: action.payload };
    case 'TOGGLE_REVIEW_MODE':
      return { ...state, isReviewMode: action.payload };
    case 'TOGGLE_WORKBENCH':
      return { ...state, showWorkbench: action.payload };
    case 'OPEN_WORKBENCH_VIEW': {
      const { view, context } = action.payload;
      // 基础状态：清理所有窗口相关状态
      const baseState = {
        ...state,
        showWorkbench: true,
        workbenchView: view,
        workbenchContext: context || {},
        showVersionHistory: false,
        versionHistoryBaseName: null,
        versionHistoryViewMode: 'grid',
        workbenchEditProjectId: null,
        workbenchCreateMode: null,
        quickUploadMode: view === 'upload' ? state.quickUploadMode : false,
        // 如果 context 包含 videoId，保留它（用于从视频卡片上传新版本）
        selectedVideoId: context?.videoId || null
      };
      
      // 根据不同视图类型设置特定状态
      if (view === 'newProject') {
        return {
          ...baseState,
          workbenchCreateMode: 'project'
        };
      }
      if (view === 'projectSettings') {
        return {
          ...baseState,
          workbenchEditProjectId: context?.projectId || null
        };
      }
      if (view === 'versionHistory') {
        return {
          ...baseState,
          showVersionHistory: true,
          versionHistoryBaseName: context?.baseName || null,
          versionHistoryViewMode: context?.viewMode || 'grid'
        };
      }
      // 默认：upload 视图
      return baseState;
    }
    case 'CLOSE_WORKBENCH':
      return {
        ...state,
        showWorkbench: false,
        workbenchView: 'none',
        workbenchContext: {},
        showVersionHistory: false,
        versionHistoryBaseName: null,
        workbenchEditProjectId: null,
        workbenchCreateMode: null,
        quickUploadMode: false
      };
    case 'TOGGLE_RETRIEVAL_PANEL':
      // 【重要】切换检索模式/文件模式
      // 在审阅、交付、案例这三个主要业务模块下：
      // - 检索模式（isRetrievalPanelVisible = true）：检索面板显示，主浏览区显示选中项目的视频
      // - 文件模式（isRetrievalPanelVisible = false）：检索面板隐藏，主浏览区切换为资源管理器视图
      const newPanelVisible = !state.isRetrievalPanelVisible;
      return { 
        ...state, 
        isRetrievalPanelVisible: newPanelVisible,
        // 当检索面板被隐藏时（切换到文件模式），如果操作台是用于新建操作，则保持显示
        // 否则隐藏操作台（因为文件模式下通常不需要操作台）
        showWorkbench: newPanelVisible ? state.showWorkbench : (state.workbenchCreateMode ? state.showWorkbench : false)
      };
    case 'SET_WORKBENCH_ACTION_TYPE':
      return { ...state, workbenchActionType: action.payload };
    case 'SET_WORKBENCH_CREATE_MODE':
      return { ...state, workbenchCreateMode: action.payload };
    case 'SET_WORKBENCH_EDIT_MODE':
      return { ...state, workbenchEditProjectId: action.payload };
    case 'SET_PENDING_PROJECT_GROUP':
      return { ...state, pendingProjectGroup: action.payload };
    case 'SET_SHOULD_TRIGGER_FILE_SELECT':
      return { ...state, shouldTriggerFileSelect: action.payload };
    case 'SET_QUICK_UPLOAD_MODE':
      return { ...state, quickUploadMode: action.payload };
    case 'SET_BROWSER_VIEW_MODE':
      return { ...state, browserViewMode: action.payload };
    case 'SET_BROWSER_CARD_SIZE':
      return { ...state, browserCardSize: action.payload };
    case 'ADD_UPLOAD':
      return { ...state, uploadQueue: [action.payload, ...state.uploadQueue] };
    case 'UPDATE_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadQueue: state.uploadQueue.map(item => 
          item.id === action.payload.id ? { ...item, progress: action.payload.progress } : item
        )
      };
    case 'COMPLETE_UPLOAD':
      return {
        ...state,
        uploadQueue: state.uploadQueue.filter(item => item.id !== action.payload)
      };
    case 'CANCEL_UPLOAD':
      return {
        ...state,
        uploadQueue: state.uploadQueue.filter(item => item.id !== action.payload)
      };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_DELIVERIES':
      return { ...state, deliveries: action.payload };
    case 'SET_RECENT_OPENED_PROJECTS':
      return { ...state, recentOpenedProjects: action.payload };
    // Share module actions
    case 'TOGGLE_SHARE_PROJECT': {
      const projectId = action.payload;
      const isSelected = state.selectedShareProjects.includes(projectId);
      return {
        ...state,
        selectedShareProjects: isSelected
          ? state.selectedShareProjects.filter(id => id !== projectId)
          : [...state.selectedShareProjects, projectId]
      };
    }
    case 'CLEAR_SHARE_PROJECTS':
      return { ...state, selectedShareProjects: [] };
    case 'SET_SHARE_PROJECTS':
      return { ...state, selectedShareProjects: action.payload };
    case 'TOGGLE_SHARE_MULTI_SELECT_MODE':
      return { 
        ...state, 
        shareMultiSelectMode: !state.shareMultiSelectMode,
        // 切换模式时清空选择
        selectedShareProjects: [],
        selectedShareProjectId: null
      };
    case 'SELECT_SHARE_PROJECT':
      return { ...state, selectedShareProjectId: action.payload };
    case 'SET_SETTINGS_TAB':
      return { ...state, settingsActiveTab: action.payload };
    case 'SHOW_VERSION_HISTORY':
      return { 
        ...state, 
        showVersionHistory: true,
        versionHistoryBaseName: action.payload.baseName,
        versionHistoryViewMode: action.payload.viewMode || 'grid',
        showWorkbench: true, // 打开操作台，但展示历史版本而非上传
        selectedVideoId: null,
        workbenchView: 'versionHistory',
        workbenchContext: { 
          baseName: action.payload.baseName, 
          projectId: action.payload.projectId, // 保存视频所属的项目ID
          viewMode: action.payload.viewMode || 'grid' 
        },
        // 清理其他窗口状态，确保只显示历史版本窗口
        workbenchEditProjectId: null,
        workbenchCreateMode: null,
        quickUploadMode: false
      };
    case 'HIDE_VERSION_HISTORY':
      // 关闭历史版本窗口时，遵循唯一原则：同时关闭操作台
      // 除非有其他活跃的操作（如新建项目、编辑项目设置）需要保持显示
      const shouldKeepWorkbenchOpen = state.workbenchCreateMode || state.workbenchEditProjectId;
      return { 
        ...state, 
        showVersionHistory: false,
        versionHistoryBaseName: null,
        // 如果没有其他活跃操作，关闭整个操作台
        showWorkbench: shouldKeepWorkbenchOpen ? true : false,
        workbenchView: shouldKeepWorkbenchOpen ? (state.workbenchCreateMode ? 'newProject' : 'projectSettings') : 'none',
        workbenchContext: shouldKeepWorkbenchOpen ? state.workbenchContext : {}
      };
    case 'SET_VERSION_HISTORY_VIEW_MODE':
      return { 
        ...state, 
        versionHistoryViewMode: action.payload
      };
    case 'ADD_TAG':
      // 如果标签已存在，不重复添加
      if (state.tags.find(t => t.id === action.payload.id)) {
        return state;
      }
      return { ...state, tags: [...state.tags, action.payload] };
    case 'ADD_NOTIFICATION':
      // 如果通知已存在，不重复添加
      if (state.notifications.find(n => n.id === action.payload.id)) {
        return state;
      }
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

// --- CONTEXT ---
export const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};

// 格式化通知时间
const formatNotificationTime = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

// --- APP COMPONENT ---
const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 注意：useApiData 现在在 AppContent 中调用，因为它需要 TeamProvider
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <ThemeProvider>
        <TeamProvider>
          <AppContent state={state} dispatch={dispatch} />
        </TeamProvider>
      </ThemeProvider>
    </StoreContext.Provider>
  );
};

// --- APP CONTENT (内部组件，可以使用Theme和TeamProvider) ---
const AppContent: React.FC<{ state: AppState; dispatch: React.Dispatch<Action> }> = ({ state, dispatch }) => {
  // 所有 Hooks 必须在组件顶层调用，不能有条件调用
  const { theme } = useTheme();
  const themeClassesHook = useThemeClasses(); // 移到顶层
  
  // Toast 状态管理
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = toastManager.subscribe((newToasts) => {
      setToasts(newToasts);
    });
    return unsubscribe;
  }, []);
  
  const handleCloseToast = React.useCallback((id: string) => {
    toastManager.close(id);
  }, []);

  // 取消上传函数
  const cancelUpload = (uploadId: string) => {
    const abortController = uploadAbortControllers.get(uploadId);
    if (abortController) {
      abortController.abort();
      uploadAbortControllers.delete(uploadId);
    }
    dispatch({ type: 'CANCEL_UPLOAD', payload: uploadId });
    
    // 发送取消通知
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: Date.now().toString(),
        type: 'info',
        title: '上传已取消',
        message: '上传任务已取消',
        time: '刚刚'
      }
    });
  };
  const { 
    projects: apiProjects, 
    videos: apiVideos, 
    tags: apiTags, 
    deliveries: apiDeliveries, 
    notifications: apiNotifications,
    recentOpenedProjects: apiRecentOpened,
    loading: apiLoading,
    error: apiError,
    loadAllData 
  } = useApiData();

  // 计算主题类（在顶层，无条件）
  const getThemeClasses = () => {
    const themeMap = {
      dark: { bg: 'bg-zinc-950', text: 'text-zinc-200' },
        'dark-gray': { bg: 'bg-neutral-900', text: 'text-neutral-200' },
      'dark-blue': { bg: 'bg-slate-950', text: 'text-slate-200' },
    };
    return themeMap[theme] || { bg: 'bg-zinc-950', text: 'text-zinc-200' };
  };

  const themeClasses = getThemeClasses();

  // 从API加载数据到state
  useEffect(() => {
    // 即使项目列表为空，也要更新 state（允许空数组）
    if (!apiLoading) {
      console.log('📊 更新应用状态:', {
        projects: apiProjects.length,
        videos: apiVideos.length,
        tags: apiTags.length,
        deliveries: apiDeliveries.length,
        notifications: apiNotifications.length,
      });
      
      dispatch({ type: 'SET_PROJECTS', payload: apiProjects });
      dispatch({ type: 'SET_VIDEOS', payload: apiVideos });
      dispatch({ type: 'SET_TAGS', payload: apiTags });
      dispatch({ type: 'SET_DELIVERIES', payload: apiDeliveries });
      
      // 处理通知
      if (apiNotifications.length > 0) {
        apiNotifications.forEach((notification: any) => {
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              id: notification.id || Date.now().toString(),
              type: notification.type || 'info',
              title: notification.title || '通知',
              message: notification.message || '',
              time: notification.created_at || new Date().toLocaleString(),
            } as AppNotification
          });
        });
      }
      
      // 更新近期打开的项目
      if (apiRecentOpened.length > 0) {
        dispatch({ 
          type: 'SET_RECENT_OPENED_PROJECTS', 
          payload: apiRecentOpened.map((p: Project) => p.id) 
        });
      }
    }
  }, [apiProjects, apiVideos, apiTags, apiNotifications, apiRecentOpened, apiLoading, dispatch]);

  // 显示加载状态
  if (apiLoading && state.projects.length === 0) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">加载数据中...</p>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (apiError && state.projects.length === 0) {
    return (
      <div className="bg-zinc-950 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{apiError}</p>
          <button
            onClick={() => loadAllData()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const renderTransferContent = () => {
    const theme = themeClassesHook; // 使用顶层的 Hook 结果
    return (
      <div className="space-y-4">
          {state.uploadQueue.length === 0 ? (
              <div className={`${theme.text.muted} text-sm text-center py-10`}>当前没有正在进行的传输任务</div>
          ) : (
              state.uploadQueue.map(item => (
                  <div key={item.id} className={`p-4 ${theme.bg.secondary} rounded-lg border ${theme.border.primary}`}>
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium ${theme.text.secondary} truncate`}>{item.filename}</h4>
                              <p className={`text-xs ${theme.text.muted} mt-1 truncate`}>上传至: {item.targetProjectName}</p>
                              <div className={`w-full ${theme.bg.tertiary} h-1.5 rounded-full mt-3 overflow-hidden`}>
                                  <div 
                                      className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                                      style={{ width: `${item.progress}%` }}
                                  ></div>
                              </div>
                              <div className={`flex justify-between items-center text-[10px] ${theme.text.muted} mt-1`}>
                                  <div className="flex items-center gap-2">
                                      <span>{item.progress}%</span>
                                      <span>{item.progress < 100 ? '正在上传...' : '处理中...'}</span>
                                  </div>
                                  {item.status === 'uploading' && (
                                      <button
                                          onClick={() => cancelUpload(item.id)}
                                          className={`px-2 py-1 ${theme.bg.tertiary} ${theme.text.muted} ${theme.bg.hover} ${theme.text.hover} rounded transition-colors flex items-center gap-1`}
                                          title="取消上传"
                                      >
                                          <X className="w-3 h-3" />
                                          <span>取消</span>
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
    );
  };

  const renderNotificationsContent = () => {
    const theme = themeClassesHook; // 使用顶层的 Hook 结果
    return (
      state.notifications.length === 0 ? (
        <div className={`flex flex-col items-center justify-center h-40 ${theme.text.muted}`}>
            <BellRing className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">暂无新通知</p>
        </div>
      ) : (
        <div className="space-y-3">
            {state.notifications.map(n => (
                <div key={n.id} className={`p-3 ${theme.bg.secondary} border ${theme.border.primary} rounded-lg flex gap-3 animate-in slide-in-from-right-2 duration-300`}>
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-emerald-500' : n.type === 'alert' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                    <div>
                        <h4 className={`text-sm ${theme.text.secondary} font-medium`}>{n.title}</h4>
                        <p className={`text-xs ${theme.text.muted} mt-1 leading-relaxed`}>{n.message}</p>
                        <span className={`text-[10px] ${theme.text.disabled} mt-2 block`}>{n.time}</span>
                    </div>
                </div>
            ))}
            <button 
              onClick={() => dispatch({type: 'CLEAR_NOTIFICATIONS'})} 
              className={`w-full py-2 text-xs ${theme.text.muted} ${theme.text.hover} ${theme.bg.hover} rounded transition-colors`}
            >
              清空通知
            </button>
        </div>
      )
    );
  };

  return (
    <div className={`${themeClasses.bg} min-h-screen ${themeClasses.text} font-sans selection:bg-indigo-500/30`}>
          
          <Header 
            onToggleDrawer={(d) => dispatch({ type: 'TOGGLE_DRAWER', payload: d })} 
            activeDrawer={state.activeDrawer} 
          />

          <Sidebar 
            activeModule={state.activeModule} 
            onChangeModule={(mod) => dispatch({ type: 'SET_MODULE', payload: mod })} 
          />

          {state.activeModule !== 'dashboard' && state.activeModule !== 'share' && <RetrievalPanel />}
          {state.activeModule === 'share' && <RetrievalPanel />}

          {state.activeModule === 'dashboard' ? (
            <>
              <Dashboard />
              {/* 操作台：Dashboard 场景不再依赖检索面板可见性，避免快速上传被隐藏 */}
              <Workbench visible={state.showWorkbench} />
            </>
          ) : state.activeModule === 'settings' ? (
            <>
              <SettingsPanel />
            </>
          ) : state.activeModule === 'share' ? (
            <>
              <ShareModule />
            </>
          ) : (
            <>
              {/* 操作台：在检索模式下显示，或者在文件模式下当 showWorkbench 为 true 时也显示（用于新建组/项目） */}
              <Workbench visible={state.showWorkbench} />
              <MainBrowser />
            </>
          )}

          <ReviewOverlay 
            isOpen={state.isReviewMode} 
            onClose={() => dispatch({ type: 'TOGGLE_REVIEW_MODE', payload: false })} 
          />

          <Drawer 
            isOpen={state.activeDrawer === 'transfer'} 
            onClose={() => dispatch({ type: 'TOGGLE_DRAWER', payload: 'none' })} 
            title={`传输队列 (${state.uploadQueue.length})`}
          >
              {renderTransferContent()}
          </Drawer>

          <Drawer 
            isOpen={state.activeDrawer === 'messages'} 
            onClose={() => dispatch({ type: 'TOGGLE_DRAWER', payload: 'none' })} 
            title={`通知消息 (${state.notifications.length})`}
          >
              {renderNotificationsContent()}
          </Drawer>

          {/* Toast 提示容器 */}
          <ToastContainer toasts={toasts} onClose={handleCloseToast} />

    </div>
  );
};

export default App;
