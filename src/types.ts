
export type ModuleType = 'library' | 'review' | 'delivery' | 'showcase' | 'settings' | 'dashboard' | 'share' | 'trash';
export type ProjectStatus = 'active' | 'finalized' | 'delivered' | 'archived';
export type VideoStatus = 'initial' | 'annotated' | 'approved';
export type AspectRatio = 'landscape' | 'portrait';
export type StorageTier = 'standard' | 'cold';

export interface Tag {
  id: string;
  name: string; // 标签名称, 如: 'AI生成', '三维制作'
  category?: string; // 标签分类, 可选
  usageCount: number; // 使用次数, 用于排序和展示
}

export interface Video {
  id: string;
  projectId: string;
  name: string; // Filename, 包含版本号前缀 v1_, v2_等
  originalFilename?: string; // 原始文件名
  baseName?: string; // 去除版本号的基础名称, 用于版本分组
  type: 'video' | 'image' | 'audio';
  url: string; 
  storageUrl?: string; // 对象存储URL
  storageKey?: string; // 对象存储Key
  storageTier?: StorageTier; // 存储层级: 标准/冷存储
  thumbnailUrl?: string; // 预览图URL
  version: number;
  uploadTime: string;
  isCaseFile: boolean; // Marked for Showcase
  isMainDelivery: boolean; // Marked as main delivery file (H.264 for showcase)
  isReference?: boolean; // 是否为引用文件, 案例模块使用
  referencedVideoId?: string; // 如果is_reference=true, 指向原文件
  size: string;
  duration?: string;
  resolution?: string; // e.g., '1920x1080'
  aspectRatio?: AspectRatio; // 横屏/竖屏, 用于UI布局
  status: VideoStatus;
  annotationCount?: number; // 批注次数
  changeLog?: string;
  tags?: string[]; // Tags like 'AI生成', '三维制作', '病毒广告', '剧情' etc. (保留兼容性)
  tagIds?: string[]; // 标签ID数组 (新字段, 关联Tag表)
}

export interface Project {
  id: string;
  name: string; // Format: YYMM_Name
  client: string;
  lead: string;
  postLead: string;
  group: string; 
  status: ProjectStatus;
  createdDate: string;
  lastActivityAt?: string; // 最后活跃时间, 用于工作台排序
  lastOpenedAt?: string; // 最后打开时间, 用于浏览区默认显示
  archivedAt?: string; // 归档时间, 用于冷归档判断
  finalizedAt?: string; // 定版时间
  deliveredAt?: string; // 交付时间
  team: string[]; // Team members visible to this project
}

export interface DeliveryData {
  projectId: string;
  hasCleanFeed: boolean;
  hasMusicAuth: boolean;
  hasMetadata: boolean;
  hasTechReview: boolean; // 技术审查通过
  hasCopyrightCheck: boolean; // 字体/音乐/视频版权风险确认
  hasScript: boolean; // 视频文稿
  hasCopyrightFiles: boolean; // 版权文件
  hasMultiResolution: boolean; // 不同分辨率文件（可选）
  deliveryNote?: string; // 交付说明
  deliveryTitle?: string; // 交付标题（用于对外交付）
  deliveryDescription?: string; // 对外交付说明
  packageLink?: string;
  sentDate?: string;
  deliveryPackages?: DeliveryPackage[]; // 交付包记录
}

export interface DeliveryPackage {
  id: string;
  projectId: string;
  title: string;
  description: string;
  link: string;
  createdAt: string;
  downloadCount: number;
  isActive: boolean;
}

// Showcase (案例) 数据结构
export interface ShowcaseItem {
  videoId: string;
  order: number;
  group?: string;
  description?: string;
}

export interface ShowcasePackage {
  id: string;
  title: string;
  description: string;
  mode: 'quick_player' | 'pitch_page'; // 更新: 快速分享/提案微站
  clientName?: string; // pitch_page模式客户名称
  link: string;
  createdAt: string;
  viewCount: number;
  isActive: boolean;
  items: ShowcaseItem[];
  salesUserId?: string; // 销售负责人, 用于接收观看通知
}

export interface UploadItem {
  id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  targetProjectName: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'alert' | 'view_tracking'; // 新增view_tracking类型
  title: string;
  message: string;
  time: string;
  relatedType?: 'video' | 'project' | 'share_link' | 'showcase_package'; // 关联类型
  relatedId?: string; // 关联ID
}

export interface AppState {
  activeModule: ModuleType;
  projects: Project[];
  videos: Video[]; // Renamed from assets
  deliveries: DeliveryData[];
  tags: Tag[]; // 系统标签列表 (新增)
  cart: string[]; // List of Video IDs for Showcase
  uploadQueue: UploadItem[]; // Global upload queue
  notifications: Notification[]; // Global notifications
  
  // UI State
  selectedProjectId: string | null;
  selectedVideoId: string | null;
  isReviewMode: boolean;
  showWorkbench: boolean;
  activeDrawer: 'none' | 'transfer' | 'messages';
  browserViewMode: 'grid' | 'list';
  browserCardSize: 'small' | 'medium' | 'large'; // NEW: Card Size State
  reviewViewMode: 'files' | 'packages'; // 审阅模块视图：文件视图 / 分享记录视图
  deliveryViewMode: 'files' | 'packages'; // 交付模块浏览区视图：文件视图 / 交付包记录视图
  selectedDeliveryFiles: string[]; // 已交付项目中选中的文件ID列表（用于生成交付链接）

  // Showcase State
  showcaseViewMode: 'files' | 'packages'; // 案例模块视图：文件视图 / 分享记录视图
  filteredShowcaseVideos: string[]; // 筛选后临时显示在浏览区的案例文件ID列表
  showcasePackages: ShowcasePackage[]; // 案例包记录
  
  // Retrieval Panel State
  // ============================================
  // 【重要】业务模块的两种工作模式说明：
  // 在审阅、交付、案例这三个主要业务模块下，有两种工作模式：
  // 
  // 1. 【检索模式】检索模式：当 isRetrievalPanelVisible = true 时
  //    - 检索面板显示在左侧，提供项目列表、搜索、标签筛选等功能
  //    - 主浏览区显示选中项目的视频文件
  //    - 用户可以通过检索面板快速定位和筛选项目
  // 
  // 2. 【文件模式】文件模式：当 isRetrievalPanelVisible = false 时
  //    - 检索面板隐藏，主浏览区占据更多空间
  //    - 主浏览区切换为资源管理器视图，按组/项目层级展示所有内容
  //    - 类似文件资源管理器，可以浏览整个项目结构
  //    - 适用于需要查看完整项目结构的场景
  // ============================================
  searchTerm: string;
  activeTag: string;
  isRetrievalPanelVisible: boolean; // 检索面板是否可见（控制检索模式/文件模式切换）
  isTagPanelExpanded: boolean; // 标签面板是否展开
  selectedGroupTag: string | null; // 选中的分组标签（单选模式）
  selectedGroupTags: string[]; // 选中的分组标签列表（多选模式）
  isTagMultiSelectMode: boolean; // 标签多选模式
  
  // 新增状态
  recentOpenedProjects: string[]; // 近期打开的项目ID列表
  showcaseSelection: string[]; // 案例遴选临时选择
  
  // Dashboard Workbench Context
  workbenchActionType?: 'review' | 'delivery' | 'showcase' | null; // 工作台操作类型（在dashboard模块时使用）
  workbenchCreateMode?: 'group' | 'project' | null; // 工作台创建模式：新建组 / 新建项目
  workbenchEditProjectId?: string | null; // 工作台编辑项目ID（在操作台中编辑项目设置）
  pendingProjectGroup?: string | null; // 待创建项目的组名（从主浏览区传递）
  shouldTriggerFileSelect?: boolean; // 是否应该自动触发文件选择（用于快速上传）
  quickUploadMode?: boolean; // 快速上传模式：在操作台显示项目选择界面
  workbenchView?: 'none' | 'newProject' | 'projectSettings' | 'upload' | 'versionHistory' | 'finalizeReview'; // 操作台当前视图
  workbenchContext?: {
    projectId?: string | null;
    videoId?: string | null;
    baseName?: string | null;
    viewMode?: 'grid' | 'list';
    from?: string;
  }; // 操作台上下文
  
  // Share Module State
  selectedShareProjects: string[]; // 分享模块中选中的项目ID列表
  shareMultiSelectMode: boolean; // 分享模块多选模式
  selectedShareProjectId: string | null; // 分享模块单选模式下的选中项目ID
  
  // Settings Module State
  settingsActiveTab: 'teams' | 'groups' | 'projects' | 'tags'; // 设置模块当前激活的标签页
  
  // Video Version History State
  showVersionHistory?: boolean; // 是否在操作台中显示历史版本
  versionHistoryViewMode?: 'grid' | 'list'; // 历史版本视图模式：卡片/列表
  versionHistoryBaseName?: string | null; // 当前查看历史版本的基础名称
}

export type Action =
  | { type: 'SET_MODULE'; payload: ModuleType }
  | { type: 'SELECT_PROJECT'; payload: string | null }
  | { type: 'SELECT_VIDEO'; payload: string | null }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'ADD_VIDEO'; payload: Video }
  | { type: 'FINALIZE_PROJECT'; payload: string } // Review -> Delivery
  | { type: 'COMPLETE_DELIVERY'; payload: string } // Delivery -> Archive/Showcase Source
  | { type: 'UPDATE_DELIVERY_CHECKLIST'; payload: { projectId: string; field: keyof DeliveryData; value: boolean } }
  | { type: 'TOGGLE_CASE_FILE'; payload: string } // Toggle isCaseFile on a Video
  | { type: 'TOGGLE_MAIN_DELIVERY'; payload: string } // Toggle isMainDelivery on a Video
  | { type: 'UPDATE_VIDEO_TAGS'; payload: { videoId: string; tags: string[] } } // Update video tags
  | { type: 'UPDATE_DELIVERY_NOTE'; payload: { projectId: string; note: string } } // Update delivery note
  | { type: 'UPDATE_DELIVERY_TITLE'; payload: { projectId: string; title: string } } // Update delivery title
  | { type: 'UPDATE_DELIVERY_DESCRIPTION'; payload: { projectId: string; description: string } } // Update delivery description
  | { type: 'GENERATE_DELIVERY_LINK'; payload: { projectId: string; fileIds: string[] } } // Generate delivery package link with selected files
  | { type: 'TOGGLE_DELIVERY_PACKAGE'; payload: { packageId: string; isActive: boolean } } // Toggle delivery package active status
  | { type: 'TOGGLE_DELIVERY_FILE_SELECTION'; payload: string } // Toggle file selection in delivery module
  | { type: 'CLEAR_DELIVERY_FILE_SELECTION' } // Clear all selected delivery files
  | { type: 'ADD_CUSTOM_TAG'; payload: string } // Add custom tag to system
  // Showcase actions
  | { type: 'SET_SHOWCASE_VIEW_MODE'; payload: 'files' | 'packages' }
  | { type: 'SET_FILTERED_SHOWCASE_VIDEOS'; payload: string[] }
  | { type: 'ADD_TO_SHOWCASE_BROWSER'; payload: string }
  | { type: 'ADD_MULTIPLE_TO_SHOWCASE_BROWSER'; payload: string[] }
  | { type: 'REMOVE_FROM_SHOWCASE_BROWSER'; payload: string }
  | { type: 'CLEAR_SHOWCASE_BROWSER' }
  | { type: 'GENERATE_SHOWCASE_PACKAGE'; payload: { title: string; description: string; mode: 'quick_player' | 'pitch_page'; clientName?: string } }
  | { type: 'TOGGLE_SHOWCASE_PACKAGE'; payload: { packageId: string; isActive: boolean } }
  // 新增Actions
  | { type: 'UPDATE_PROJECT_LAST_OPENED'; payload: string } // 更新项目最后打开时间
  | { type: 'SET_RECENT_OPENED_PROJECTS'; payload: string[] } // 设置近期打开项目
  | { type: 'ADD_TAG'; payload: Tag } // 添加标签
  | { type: 'UPDATE_VIDEO_ASPECT_RATIO'; payload: { videoId: string; aspectRatio: AspectRatio } } // 更新视频横竖屏
  | { type: 'TOGGLE_CART_ITEM'; payload: string } // Showcase Cart
  | { type: 'SET_CART'; payload: string[] } // 设置购物车内容
  | { type: 'CLEAR_CART' } // 清空购物车
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_TAG'; payload: string }
  | { type: 'TOGGLE_TAG_PANEL' } // 切换标签面板展开/收起
  | { type: 'SET_GROUP_TAG'; payload: string | null } // 设置选中的分组标签（单选模式）
  | { type: 'TOGGLE_TAG_MULTI_SELECT_MODE' } // 切换标签多选模式
  | { type: 'TOGGLE_GROUP_TAG'; payload: string } // 切换分组标签选择（多选模式）
  | { type: 'CLEAR_GROUP_TAGS' } // 清空选中的分组标签
  | { type: 'TOGGLE_DRAWER'; payload: 'none' | 'transfer' | 'messages' }
  | { type: 'TOGGLE_REVIEW_MODE'; payload: boolean }
  | { type: 'TOGGLE_WORKBENCH'; payload: boolean }
  | { type: 'TOGGLE_RETRIEVAL_PANEL' } // 切换检索面板显示/隐藏
  | { type: 'UPDATE_VIDEO_STATUS'; payload: { videoId: string; status: VideoStatus } }
  | { type: 'UPDATE_VIDEO'; payload: Video }
  | { type: 'SET_BROWSER_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_BROWSER_CARD_SIZE'; payload: 'small' | 'medium' | 'large' }
  | { type: 'SET_REVIEW_VIEW_MODE'; payload: 'files' | 'packages' }
  | { type: 'SET_DELIVERY_VIEW_MODE'; payload: 'files' | 'packages' }
  | { type: 'ADD_UPLOAD'; payload: UploadItem }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'COMPLETE_UPLOAD'; payload: string }
  | { type: 'CANCEL_UPLOAD'; payload: string }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_WORKBENCH_ACTION_TYPE'; payload: 'review' | 'delivery' | 'showcase' | null } // 设置工作台操作类型
  | { type: 'SET_WORKBENCH_CREATE_MODE'; payload: 'group' | 'project' | null } // 设置工作台创建模式
  | { type: 'SET_WORKBENCH_EDIT_MODE'; payload: string | null } // 设置工作台编辑项目ID（在操作台中编辑项目设置）
  | { type: 'OPEN_WORKBENCH_VIEW'; payload: { view: 'newProject' | 'projectSettings' | 'upload' | 'versionHistory' | 'finalizeReview'; context?: { projectId?: string | null; videoId?: string | null; baseName?: string | null; viewMode?: 'grid' | 'list'; from?: string } } } // 统一打开操作台视图
  | { type: 'CLOSE_WORKBENCH' } // 统一关闭操作台视图
  | { type: 'SET_PENDING_PROJECT_GROUP'; payload: string | null } // 设置待创建项目的组名
  | { type: 'SET_SHOULD_TRIGGER_FILE_SELECT'; payload: boolean } // 设置是否应该自动触发文件选择
  | { type: 'SET_QUICK_UPLOAD_MODE'; payload: boolean } // 设置快速上传模式
  | { type: 'SET_PROJECTS'; payload: Project[] } // 设置项目列表
  | { type: 'SET_VIDEOS'; payload: Video[] } // 设置视频列表
  | { type: 'SET_TAGS'; payload: Tag[] } // 设置标签列表
  | { type: 'SET_DELIVERIES'; payload: DeliveryData[] } // 设置交付数据列表
  // Share module actions
  | { type: 'TOGGLE_SHARE_PROJECT'; payload: string } // 切换分享模块中的项目选择（多选模式）
  | { type: 'CLEAR_SHARE_PROJECTS' } // 清空分享模块中的项目选择
  | { type: 'SET_SHARE_PROJECTS'; payload: string[] } // 设置分享模块中的项目选择
  | { type: 'TOGGLE_SHARE_MULTI_SELECT_MODE' } // 切换分享模块多选模式
  | { type: 'SELECT_SHARE_PROJECT'; payload: string | null } // 选择分享模块中的项目（单选模式）
  | { type: 'SET_SETTINGS_TAB'; payload: 'teams' | 'groups' | 'projects' | 'tags' }
  | { type: 'SHOW_VERSION_HISTORY'; payload: { baseName: string; projectId: string; viewMode?: 'grid' | 'list' } } // 显示历史版本
  | { type: 'HIDE_VERSION_HISTORY' } // 隐藏历史版本
  | { type: 'SET_VERSION_HISTORY_VIEW_MODE'; payload: 'grid' | 'list' }; // 设置历史版本视图模式 // 设置设置模块的激活标签页
