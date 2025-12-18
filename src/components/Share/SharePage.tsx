import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Download, Lock, AlertCircle, Loader2, X, MessageSquare, Send, CheckCircle, FileText, User } from 'lucide-react';
import { sharesApi, ShareLinkDetail } from '../../api/shares';
import { annotationsApi, Annotation } from '../../api/annotations';
import { AuthModal } from '../Auth/AuthModal';

export const SharePage: React.FC = () => {
  const { token, shortCode } = useParams<{ token?: string; shortCode?: string }>();
  const navigate = useNavigate();
  const [shareLink, setShareLink] = useState<ShareLinkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  // 审阅功能状态
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationInput, setAnnotationInput] = useState('');
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  
  // 访客身份状态
  const [guestName, setGuestName] = useState('');
  const [isGuestNameConfirmed, setIsGuestNameConfirmed] = useState(false); // 是否已确认身份
  const [isComposing, setIsComposing] = useState(false); // 是否正在使用输入法组合输入

  // 已登录用户状态
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // 导出PDF状态
  const [isExporting, setIsExporting] = useState(false);

  // 登录弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 获取有效的 token（支持完整 token 或短链接）
  const shareToken = token || shortCode || '';

  // 批注者颜色映射 - 为每个不同的批注者分配一个固定颜色
  const annotatorColors = useMemo(() => {
    const colors = [
      '#6366f1', // indigo
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#f97316', // orange
      '#14b8a6', // teal
      '#22c55e', // green
      '#eab308', // yellow
      '#06b6d4', // cyan
      '#f43f5e', // rose
      '#a855f7', // purple
    ];
    
    const colorMap: Record<string, string> = {};
    const annotators = new Set<string>();
    
    annotations.forEach(a => {
      // API 返回 camelCase (clientName)，但也兼容 snake_case (client_name)
      const rawA = a as any;
      const displayName = a.user?.name || rawA.clientName || a.client_name || '访客';
      const userType = rawA.userType || a.userType || (a.user?.name ? 'personal_user' : 'guest');
      const teamName = rawA.teamName || a.teamName;
      // 使用显示名称作为唯一标识，但显示时会加上用户类型标签
      annotators.add(displayName);
    });
    
    Array.from(annotators).forEach((name, index) => {
      colorMap[name] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [annotations]);

  // 将时间码字符串转换为秒数
  const timecodeToSeconds = (timecode: string): number => {
    const parts = timecode.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
  };

  useEffect(() => {
    if (!shareToken) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }

    loadShareLink();
  }, [shareToken]);

  const loadShareLink = async () => {
    try {
      setLoading(true);
      const data = await sharesApi.getByToken(shareToken);
      
      if ((data as any).error) {
        setError((data as any).error);
        setLoading(false);
        return;
      }

      setShareLink(data);
      
      // 检查是否需要密码验证
      const needPassword = data.hasPassword === true;
      if (!needPassword) {
        setIsPasswordVerified(true);
        // 如果是审阅类型且没有密码保护，直接加载批注
        const videoId = data.video_id || data.videoId;
        if (data.type === 'video_review' && videoId) {
          loadAnnotations();
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载分享链接失败');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('请输入密码');
      return;
    }

    try {
      const response = await sharesApi.verifyPassword(shareToken, password);

      if ((response as any).error) {
        setPasswordError((response as any).error);
        return;
      }

      setIsPasswordVerified(true);
      setPasswordError('');
      
      // 密码验证通过后，如果是审阅类型，加载批注
      const videoId = shareLink?.video_id || shareLink?.videoId;
      if (shareLink?.type === 'video_review' && videoId) {
        loadAnnotations();
      }
    } catch (err: any) {
      setPasswordError(err.message || '密码验证失败');
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = Number(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number | string) => {
    if (typeof bytes === 'string') {
      // 如果已经是格式化后的字符串，直接返回
      if (bytes.includes('GB') || bytes.includes('MB') || bytes.includes('KB')) {
        return bytes;
      }
      bytes = parseInt(bytes, 10);
    }
    if (!bytes || isNaN(bytes)) return '';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
  };

  // 格式化视频时长（秒转为 MM:SS 或 HH:MM:SS）
  const formatDuration = (seconds: number | string) => {
    if (typeof seconds === 'string') {
      // 如果已经是格式化后的字符串，直接返回
      if (seconds.includes(':')) {
        return seconds;
      }
      seconds = parseInt(seconds, 10);
    }
    if (!seconds || isNaN(seconds)) return '';
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const url = shareLink?.video?.storageUrl || shareLink?.video?.storage_url || shareLink?.video?.url;
    const filename = shareLink?.video?.name || shareLink?.video?.originalFilename || 'video.mp4';
    
    if (url) {
      // 创建隐藏的 a 标签来触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      // 对于跨域资源，需要先获取然后下载
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          link.href = blobUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(() => {
          // 如果 fetch 失败，直接使用原始链接
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  };

  // 导出PDF
  const handleExportPdf = async () => {
    if (!shareToken) return;
    
    setIsExporting(true);
    try {
      const result = await sharesApi.exportPdf(shareToken);
      if (result.error) {
        alert(result.error);
      } else if (result.url) {
        // 构建完整的下载URL
        const env = import.meta.env as any;
        let baseUrl: string;
        if (env.VITE_API_BASE_URL) {
          baseUrl = env.VITE_API_BASE_URL.replace('/api', '');
        } else if (env.PROD) {
          baseUrl = 'https://api.vioflow.cc';
        } else {
          const hostname = window.location.hostname;
          const serverIp = '192.168.110.112';
          if (hostname === 'localhost' || hostname === '127.0.0.1') {
            baseUrl = `http://${serverIp}:3002`;
          } else if (hostname.match(/^(192\.168\.|172\.|10\.)/)) {
            baseUrl = `http://${hostname}:3002`;
          } else {
            baseUrl = `http://${serverIp}:3002`;
          }
        }
        window.open(`${baseUrl}${result.url}`, '_blank');
      }
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert('导出PDF失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 加载批注
  const loadAnnotations = async () => {
    if (!shareToken) return;
    try {
      const data = await annotationsApi.getByShareToken(shareToken);
      if (Array.isArray(data)) {
        setAnnotations(data);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  // 添加批注
  const handleAddAnnotation = async () => {
    if (!annotationInput.trim() || !shareToken || !videoRef.current) return;
    
    // 如果没有设置访客名称，提示用户先设置
    if (!guestName.trim() || !isGuestNameConfirmed) {
      setIsGuestNameConfirmed(false);
      return;
    }

    setIsSubmittingAnnotation(true);
    try {
      // 获取当前播放时间并转换为时间码格式 (HH:MM:SS)
      const time = videoRef.current.currentTime;
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      const timecode = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const result = await annotationsApi.createByShareToken(shareToken, {
        timecode,
        content: annotationInput.trim(),
        clientName: guestName.trim(),
      });

      if ((result as any).error) {
        alert((result as any).error);
      } else {
        setAnnotationInput('');
        // 重新加载批注
        await loadAnnotations();
      }
    } catch (error: any) {
      alert(error.message || '添加批注失败');
    } finally {
      setIsSubmittingAnnotation(false);
    }
  };

  // 跳转到批注时间点
  const handleJumpToTimecode = (timecode: string) => {
    if (!videoRef.current) return;
    const parts = timecode.split(':').map(Number);
    const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  // 格式化时间码显示
  const formatTimecode = (timecode: string) => {
    return timecode;
  };

  // 格式化日期时间
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">无法访问</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!shareLink) {
    return null;
  }

  // 需要密码验证
  if (!isPasswordVerified) {
    const videoName = shareLink.video?.name || '视频文件';
    const projectName = shareLink.project?.name;
    
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* 视频预览信息 */}
          <div className="bg-zinc-800/50 p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{videoName}</p>
                {projectName && (
                  <p className="text-xs text-zinc-500 truncate">{projectName}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">需要输入密码</h2>
              <p className="text-zinc-500 text-sm">此视频受密码保护，请输入密码以查看</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  placeholder="请输入访问密码"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                验证密码
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const video = shareLink.video;
  const project = shareLink.project;
  // 兼容两种命名格式
  const videoUrl = video?.storageUrl || video?.storage_url || video?.url;
  const isReviewMode = shareLink.type === 'video_review';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
                {video?.name || '视频分享'}
              </h1>
              {project && (
                <p className="text-sm text-zinc-400 truncate mt-1">
                  {project.name} • {project.client}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isReviewMode && (
                <button
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">批注 ({annotations.length})</span>
                </button>
              )}
              {(shareLink.allow_download || shareLink.allowDownload) && videoUrl && (
                <button
                  onClick={handleDownload}
                  className="ml-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">下载视频</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 ${isReviewMode && showAnnotations ? 'flex flex-col lg:flex-row gap-4 lg:gap-6' : ''}`}>
        <div className={`space-y-4 sm:space-y-6 ${isReviewMode && showAnnotations ? 'flex-1 min-w-0' : 'w-full'}`}>
          {/* Video Player */}
          {videoUrl ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Play/Pause Overlay - 只在暂停时或鼠标悬停时显示 */}
                <div 
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
                  onClick={handlePlayPause}
                >
                  <button
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-black/40 hover:bg-indigo-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white group-hover:scale-110 transition-transform" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
              </div>

              {/* Video Controls */}
              <div className="px-4 sm:px-6 py-4 bg-zinc-950 border-t border-zinc-800">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-zinc-300" />
                    ) : (
                      <Play className="w-5 h-5 text-zinc-300" />
                    )}
                  </button>

                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs text-zinc-500 min-w-[40px]">
                      {formatTime(currentTime)}
                    </span>
                    {/* 进度条容器 - 带批注标记 */}
                    <div className="flex-1 relative group">
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 relative z-10"
                        style={{
                          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${duration ? (currentTime / duration) * 100 : 0}%, #3f3f46 ${duration ? (currentTime / duration) * 100 : 0}%, #3f3f46 100%)`,
                        }}
                      />
                      {/* 批注时间点标记 - 关键帧样式 */}
                      {duration > 0 && annotations.map((annotation) => {
                        // API 返回 camelCase (clientName)，但也兼容 snake_case (client_name)
                        const rawAnnotation = annotation as any;
                        const displayName = annotation.user?.name || rawAnnotation.clientName || annotation.client_name || '访客';
                        const userType = rawAnnotation.userType || annotation.userType || (annotation.user?.name ? 'personal_user' : 'guest');
                        const teamName = rawAnnotation.teamName || annotation.teamName;
                        const annotatorName = userType === 'team_user' && teamName 
                          ? `${displayName} (${teamName})`
                          : userType === 'personal_user'
                            ? `${displayName} (个人用户)`
                            : `${displayName} (访客)`;
                        const color = annotatorColors[annotatorName] || '#6366f1';
                        const timeInSeconds = timecodeToSeconds(annotation.timecode);
                        const position = (timeInSeconds / duration) * 100;
                        
                        return (
                          <div
                            key={annotation.id}
                            className="absolute top-1/2 -translate-y-1/2 z-20 cursor-pointer group/marker"
                            style={{ left: `${position}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (videoRef.current) {
                                videoRef.current.currentTime = timeInSeconds;
                              }
                            }}
                            title={`${annotatorName}: ${annotation.content.substring(0, 50)}${annotation.content.length > 50 ? '...' : ''}`}
                          >
                            {/* 关键帧标记 - 菱形样式 */}
                            <div 
                              className="w-4 h-4 -ml-2 rotate-45 shadow-lg transition-all duration-200 group-hover/marker:scale-125 border-2"
                              style={{ 
                                backgroundColor: color,
                                borderColor: 'rgba(255,255,255,0.8)',
                                boxShadow: `0 0 8px ${color}, 0 2px 4px rgba(0,0,0,0.3)`,
                              }}
                            />
                            {/* 底部小三角指示器 */}
                            <div 
                              className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent opacity-80"
                              style={{ borderTopColor: color }}
                            />
                            {/* 悬停提示 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover/marker:block z-30 pointer-events-none">
                              <div 
                                className="px-3 py-1.5 rounded-lg text-xs text-white whitespace-nowrap max-w-[220px] truncate shadow-xl"
                                style={{ backgroundColor: color }}
                              >
                                <span className="font-semibold">{annotatorName}</span>
                                <span className="opacity-80 ml-1.5 font-mono">({annotation.timecode})</span>
                              </div>
                              <div 
                                className="w-2.5 h-2.5 rotate-45 mx-auto -mt-1.5"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-xs text-zinc-500 min-w-[40px]">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">视频文件不可用</p>
            </div>
          )}

          {/* Video Info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">视频信息</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {/* 主交付文件不显示版本号 */}
              {video?.version && !video?.isMainDelivery && (
                <div>
                  <span className="text-zinc-500">版本：</span>
                  <span className="text-zinc-200 ml-2">v{video.version}</span>
                </div>
              )}
              {video?.size && (
                <div>
                  <span className="text-zinc-500">大小：</span>
                  <span className="text-zinc-200 ml-2">{formatFileSize(video.size)}</span>
                </div>
              )}
              {video?.duration && (
                <div>
                  <span className="text-zinc-500">时长：</span>
                  <span className="text-zinc-200 ml-2">{formatDuration(video.duration)}</span>
                </div>
              )}
              {video?.resolution && (
                <div>
                  <span className="text-zinc-500">分辨率：</span>
                  <span className="text-zinc-200 ml-2">{video.resolution}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 批注侧边栏（仅审阅模式） */}
        {isReviewMode && showAnnotations && (
          <aside className="w-full lg:w-80 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col shrink-0 h-[60vh] lg:h-[calc(100vh-200px)]">
            <div className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950 rounded-t-xl">
              <span className="font-semibold text-sm text-zinc-200">批注 ({annotations.length})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting || annotations.length === 0}
                  className="p-1.5 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                  title="导出审阅报告 (PDF)"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
                <button
                  onClick={() => setShowAnnotations(false)}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {annotations.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无批注</p>
                  <p className="text-xs mt-1 opacity-70">在下方添加您的审阅意见</p>
                </div>
              ) : (
                annotations.map((annotation) => {
                  // 获取显示名称：优先使用用户名，其次是访客名称
                  // API 返回 camelCase (clientName)，但也兼容 snake_case (client_name)
                  const rawAnnotation = annotation as any;
                  const displayName = annotation.user?.name || rawAnnotation.clientName || annotation.client_name || '访客';
                  const initial = displayName.charAt(0).toUpperCase();
                  
                  // 获取用户类型和团队名称
                  const userType = rawAnnotation.userType || annotation.userType || (annotation.user?.name ? 'personal_user' : 'guest');
                  const teamName = rawAnnotation.teamName || annotation.teamName;
                  
                  // 根据用户类型确定标签和样式
                  const isGuest = userType === 'guest';
                  const isTeamUser = userType === 'team_user';
                  const isPersonalUser = userType === 'personal_user';
                  
                  // 用户类型标签文本
                  const userTypeLabel = isGuest 
                    ? '访客' 
                    : isTeamUser 
                      ? teamName || '团队用户'
                      : '个人用户';
                  
                  // 用户类型样式
                  const avatarClass = isGuest 
                    ? 'bg-amber-900/50 border border-amber-500/30 text-amber-300' 
                    : isTeamUser
                      ? 'bg-indigo-900/50 border border-indigo-500/30 text-indigo-300'
                      : 'bg-emerald-900/50 border border-emerald-500/30 text-emerald-300';
                  
                  const labelClass = isGuest
                    ? 'text-amber-500/70'
                    : isTeamUser
                      ? 'text-indigo-500/70'
                      : 'text-emerald-500/70';
                  
                  return (
                    <div key={annotation.id} className="flex gap-3 group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${avatarClass}`}>
                        {initial}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                            {displayName}
                            <span className={`text-[10px] font-normal ${labelClass}`}>
                              ({userTypeLabel})
                            </span>
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {formatDateTime(annotation.created_at)}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg border bg-zinc-800/50 border-zinc-800 text-zinc-300 text-sm leading-relaxed">
                          {annotation.content}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => handleJumpToTimecode(annotation.timecode)}
                            className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-500/20 transition-colors"
                          >
                            {formatTimecode(annotation.timecode)}
                          </button>
                          {annotation.is_completed && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              已处理
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-xl space-y-3">
              {/* 身份设置区域 */}
              {!isGuestNameConfirmed ? (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>请先设置您的身份以添加批注</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={(e) => {
                        setIsComposing(false);
                        // 在组合输入结束时更新值
                        setGuestName((e.target as HTMLInputElement).value);
                      }}
                      onKeyDown={(e) => {
                        // 只有在非输入法组合状态下才处理 Enter
                        if (e.key === 'Enter' && !isComposing && guestName.trim()) {
                          setIsGuestNameConfirmed(true);
                        }
                      }}
                      placeholder="请输入您的名称（如：张三）"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (guestName.trim()) {
                          setIsGuestNameConfirmed(true);
                        }
                      }}
                      disabled={!guestName.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      确定
                    </button>
                  </div>
                  <div className="text-center pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">或者使用已有账号登录</p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                      登录账号 →
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 显示当前身份 - 区分登录用户和访客 */}
                  {guestName.trim() && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 flex items-center gap-1.5">
                        {loggedInUser ? (
                          <>
                            <User className="w-3.5 h-3.5 text-indigo-400" />
                            <span>已登录: <span className="text-indigo-400 font-medium">{guestName}</span></span>
                          </>
                        ) : (
                          <>
                            当前身份: <span className="text-amber-400">{guestName}</span>
                            <span className="text-zinc-600 ml-1">(访客)</span>
                          </>
                        )}
                      </span>
                      {!loggedInUser && (
                        <button
                          onClick={() => setIsGuestNameConfirmed(false)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          修改
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* 批注输入 */}
                  <div className="relative">
                    <input
                      type="text"
                      value={annotationInput}
                      onChange={(e) => setAnnotationInput(e.target.value)}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={(e) => {
                        setIsComposing(false);
                        setAnnotationInput((e.target as HTMLInputElement).value);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isComposing && handleAddAnnotation()}
                      placeholder={`在 ${formatTime(currentTime)} 添加批注...`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-10 py-3 text-sm text-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                      disabled={isSubmittingAnnotation}
                    />
                    <button
                      onClick={handleAddAnnotation}
                      disabled={!annotationInput.trim() || isSubmittingAnnotation}
                      className="absolute right-2 top-2 p-1.5 text-zinc-500 hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingAnnotation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* 登录/注册弹窗 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={(userInfo) => {
          // 登录成功后直接使用传递的用户信息
          if (userInfo && userInfo.name) {
            setLoggedInUser({
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
            });
            // 设置用户身份用于批注
            setGuestName(userInfo.name);
            setIsGuestNameConfirmed(true);
          }
          // 关闭登录弹窗
          setShowAuthModal(false);
          // 刷新批注列表
          loadAnnotations();
        }}
      />
    </div>
  );
};

