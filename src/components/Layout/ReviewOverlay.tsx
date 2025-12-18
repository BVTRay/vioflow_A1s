
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, MessageSquare, Mic, SkipBack, Play, Pause, SkipForward, Settings2, Download, CheckCircle, Send, FileText, Loader2, Trash2, AlertTriangle, Share2, X, Lock, Calendar, Infinity, Copy, Check, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../App';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { annotationsApi, Annotation } from '../../api/annotations';
import { videosApi } from '../../api/videos';
import { sharesApi } from '../../api/shares';
import { ConfirmModal } from '../UI/ConfirmModal';
import { useApiData } from '../../hooks/useApiData';
import { Video } from '../../types';

interface ReviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewOverlay: React.FC<ReviewOverlayProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useStore();
  const theme = useThemeClasses();
  const { selectedVideoId, videos } = state;
  const video = videos.find(v => v.id === selectedVideoId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { refreshVideos } = useApiData();

  // 视频播放状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 批注状态
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 视频播放URL
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoadingVideoUrl, setIsLoadingVideoUrl] = useState(false);

  // 删除相关状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'version' | 'all'>('version');
  const [isDeleting, setIsDeleting] = useState(false);
  const [versionCount, setVersionCount] = useState(1);

  // 分享相关状态
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareStep, setShareStep] = useState<'warning' | 'config' | 'success'>('config');
  const [shareAllowDownload, setShareAllowDownload] = useState(false);
  const [shareHasPassword, setShareHasPassword] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiryOption, setShareExpiryOption] = useState<'7days' | 'permanent'>('7days');
  const [shareJustification, setShareJustification] = useState('');
  const [shareGeneratedLink, setShareGeneratedLink] = useState('');
  const [shareIsLoading, setShareIsLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareCopySuccess, setShareCopySuccess] = useState(false);

  // 加载批注和视频URL
  useEffect(() => {
    if (isOpen && video?.id) {
      loadAnnotations();
      loadVideoUrl();
      loadVersionCount();
    }
  }, [isOpen, video?.id]);

  // 加载版本数量
  const loadVersionCount = () => {
    if (!video) return;
    const baseName = video.baseName || video.name.replace(/^v\d+_/, '');
    const versions = videos.filter(v => 
      v.projectId === video.projectId && 
      (v.baseName || v.name.replace(/^v\d+_/, '')) === baseName
    );
    setVersionCount(versions.length);
  };

  // 视频加载完成后自动播放
  useEffect(() => {
    if (videoUrl && videoRef.current && isOpen) {
      // 延迟一点确保视频元素已准备好
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.log('自动播放失败（可能需要用户交互）:', err);
          });
          setIsPlaying(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [videoUrl, isOpen]);

  const loadVideoUrl = async () => {
    if (!video?.id) return;
    
    setIsLoadingVideoUrl(true);
    try {
      // 优先尝试获取签名URL（适用于私有存储桶）
      const url = await videosApi.getPlaybackUrl(video.id, true);
      setVideoUrl(url);
    } catch (error) {
      console.error('获取视频播放URL失败:', error);
      // 如果获取失败，回退到存储的URL
      setVideoUrl(video?.storageUrl || video?.url || null);
    } finally {
      setIsLoadingVideoUrl(false);
    }
  };

  const loadAnnotations = async () => {
    if (!video?.id) return;
    
    setIsLoadingAnnotations(true);
    try {
      const data = await annotationsApi.getAll(video.id);
      setAnnotations(data || []);
    } catch (error) {
      console.error('加载批注失败:', error);
      setAnnotations([]);
    } finally {
      setIsLoadingAnnotations(false);
    }
  };

  // 视频播放控制
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
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = Number(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkipBack = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const handleSkipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取当前时间码（用于显示在输入框）
  const getCurrentTimecode = () => {
    const hours = Math.floor(currentTime / 3600);
    const minutes = Math.floor((currentTime % 3600) / 60);
    const seconds = Math.floor(currentTime % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 添加批注
  const handleAddComment = async () => {
    if (!commentInput.trim() || !video?.id) return;
    
    setIsSubmittingAnnotation(true);
    try {
      const timecode = getCurrentTimecode();
      
      await annotationsApi.create({
        videoId: video.id,
        timecode,
        content: commentInput.trim(),
      });
      
      setCommentInput('');
      // 重新加载批注
      await loadAnnotations();
      
      // 重新加载视频信息以获取更新的批注计数
      if (video.id) {
        try {
          const updatedVideo = await videosApi.getById(video.id);
          if (updatedVideo) {
            dispatch({ 
              type: 'UPDATE_VIDEO', 
              payload: updatedVideo as Video
            });
          }
        } catch (error) {
          console.error('更新视频信息失败:', error);
        }
      }
    } catch (error: any) {
      console.error('添加批注失败:', error);
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
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

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
      // 兼容 clientName 和 client_name 两种格式
      const rawA = a as any;
      const displayName = a.user?.name || rawA.clientName || a.client_name || '访客';
      // 使用显示名称作为唯一标识
      annotators.add(displayName);
    });
    
    Array.from(annotators).forEach((name, index) => {
      colorMap[name] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [annotations]);

  // 导出PDF
  const handleExportPDF = async () => {
    if (!video?.id) return;
    
    setIsExporting(true);
    try {
      const result = await annotationsApi.exportPdf(video.id);
      if (result.url) {
        window.open(result.url, '_blank');
      } else {
        alert('导出功能暂未实现');
      }
    } catch (error: any) {
      console.error('导出失败:', error);
      alert(error.message || '导出失败');
    } finally {
      setIsExporting(false);
    }
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

  // 处理删除
  // 检查当前视频是否是最新版本
  const isLatestVersion = () => {
    if (!video) return true;
    const baseName = video.baseName || video.name.replace(/^v\d+_/, '');
    const versions = videos.filter(v => 
      v.projectId === video.projectId && 
      (v.baseName || v.name.replace(/^v\d+_/, '')) === baseName
    );
    const maxVersion = Math.max(...versions.map(v => v.version));
    return video.version === maxVersion;
  };

  // 打开分享弹窗
  const handleShareClick = () => {
    const isLatest = isLatestVersion();
    setShareStep(isLatest ? 'config' : 'warning');
    setShareAllowDownload(false);
    setShareHasPassword(false);
    setSharePassword('');
    setShareExpiryOption('7days');
    setShareJustification('');
    setShareGeneratedLink('');
    setShareError('');
    setShareCopySuccess(false);
    setShareModalOpen(true);
  };

  // 生成分享链接
  const handleGenerateShareLink = async () => {
    if (!video) return;

    setShareIsLoading(true);
    setShareError('');

    try {
      let expiresAt: string | undefined;
      if (shareExpiryOption === '7days') {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        expiresAt = date.toISOString();
      }

      const shareLink = await sharesApi.create({
        type: 'video_review',
        videoId: video.id,
        projectId: video.projectId,
        allowDownload: shareAllowDownload,
        hasPassword: shareHasPassword,
        password: shareHasPassword ? sharePassword : undefined,
        expiresAt,
        justification: !isLatestVersion() ? shareJustification : undefined,
      });

      const shareDomain = import.meta.env.VITE_SHARE_DOMAIN || window.location.origin;
      const shortCode = shareLink.token.substring(0, 8);
      const link = `${shareDomain}/s/${shortCode}`;

      setShareGeneratedLink(link);
      setShareStep('success');
    } catch (error: any) {
      console.error('Create share link error:', error);
      setShareError(error.response?.data?.message || error.message || '创建分享链接失败');
    } finally {
      setShareIsLoading(false);
    }
  };

  // 复制分享链接
  const handleCopyShareLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareGeneratedLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareGeneratedLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setShareCopySuccess(true);
      setTimeout(() => setShareCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制链接');
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!video?.id) return;
    
    setIsDeleting(true);
    try {
      await videosApi.delete(video.id, deleteType === 'all');
      
      // 刷新视频列表
      await refreshVideos();
      
      // 关闭审阅界面
      onClose();
      
      // 清除选中的视频
      dispatch({ type: 'SELECT_VIDEO', payload: null });
    } catch (error: any) {
      console.error('删除视频失败:', error);
      alert(error?.response?.data?.message || '删除失败，请重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen || !video) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 top-14 z-50 bg-zinc-950 flex animate-in fade-in duration-200">
      
      {/* Left: Player Area */}
      <div className="flex-1 flex flex-col relative bg-black/50">
        
        {/* Header Toolbar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-6">
            <button 
                onClick={onClose}
                className={`flex items-center gap-2 ${theme.text.tertiary} ${theme.text.hoverPrimary} ${theme.bg.secondary}/50 ${theme.bg.hover}/80 px-4 py-2 rounded-full backdrop-blur-md transition-all border border-white/5`}
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">退出审阅</span>
            </button>
            <div className="text-sm font-mono text-zinc-400">{video.name || '未选择视频'}</div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleShareClick}
                    className={`flex items-center gap-2 ${theme.text.tertiary} ${theme.text.hoverPrimary} ${theme.bg.secondary}/50 ${theme.bg.hover}/80 px-4 py-2 rounded-full backdrop-blur-md transition-all border border-white/5 hover:border-indigo-500/50 hover:text-indigo-400`}
                    title="对外分享"
                >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">分享</span>
                </button>
                <button
                    onClick={handleDeleteClick}
                    className={`flex items-center gap-2 ${theme.text.tertiary} ${theme.text.hoverPrimary} ${theme.bg.secondary}/50 ${theme.bg.hover}/80 px-4 py-2 rounded-full backdrop-blur-md transition-all border border-white/5 hover:border-red-500/50 hover:text-red-400`}
                    title="删除视频"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">删除</span>
                </button>
            </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center p-8">
            <div className={`aspect-video w-full max-w-5xl ${theme.bg.secondary} rounded-lg shadow-2xl relative overflow-hidden ring-1 ${theme.border.primary}`}>
                {isLoadingVideoUrl ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <span className="ml-3 text-zinc-400">正在加载视频...</span>
                  </div>
                ) : videoUrl ? (
                  <>
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
                      onError={(e) => {
                        console.error('视频播放错误:', e);
                        // 如果签名URL过期或无效，尝试重新获取
                        if (video?.id) {
                          loadVideoUrl();
                        }
                      }}
                    />
                    {/* Play/Pause Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button
                        onClick={handlePlayPause}
                        className="pointer-events-auto w-20 h-20 bg-white/10 hover:bg-indigo-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 fill-white text-white group-hover:scale-110 transition-transform" />
                        ) : (
                          <Play className="w-8 h-8 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-zinc-500">视频加载失败或URL不存在</div>
                  </div>
                )}
            </div>
        </div>

        {/* Bottom Controls */}
        <div className={`h-24 ${theme.bg.primary} border-t ${theme.border.primary} px-8 flex flex-col justify-center gap-4`}>
             <div 
                className={`w-full h-1.5 ${theme.bg.tertiary} rounded-full cursor-pointer group relative`}
                onClick={(e) => {
                  if (!videoRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  const newTime = percent * duration;
                  videoRef.current.currentTime = newTime;
                  setCurrentTime(newTime);
                }}
             >
                 <div 
                    className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors"
                    style={{ width: `${progress}%` }}
                 ></div>
                 <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    style={{ left: `calc(${progress}% - 6px)` }}
                 ></div>
                 
                 {/* 批注时间点标记 - 关键帧样式 */}
                 {duration > 0 && annotations.map((annotation) => {
                   // 兼容 clientName 和 client_name 两种格式
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
                         handleJumpToTimecode(annotation.timecode);
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
             
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-6">
                     <div className="flex items-center gap-4 text-zinc-400">
                         <button onClick={handleSkipBack} className="hover:text-white cursor-pointer">
                           <SkipBack className="w-5 h-5" />
                         </button>
                         <button onClick={handlePlayPause} className="hover:text-white cursor-pointer">
                           {isPlaying ? (
                             <Pause className="w-6 h-6 fill-current" />
                           ) : (
                             <Play className="w-6 h-6 fill-current" />
                           )}
                         </button>
                         <button onClick={handleSkipForward} className="hover:text-white cursor-pointer">
                           <SkipForward className="w-5 h-5" />
                         </button>
                     </div>
                     <span className="text-xs font-mono text-indigo-400">
                       {formatTime(currentTime)} <span className="text-zinc-600">/ {formatTime(duration)}</span>
                     </span>
                 </div>
                 
                 <div className="flex items-center gap-4 text-zinc-400">
                     <button 
                        onClick={handleExportPDF} 
                        className={`flex items-center gap-2 ${theme.text.hoverPrimary} ${theme.bg.hover} px-3 py-1.5 rounded transition-colors disabled:opacity-50`}
                        disabled={isExporting}
                        title="导出审阅报告 (PDF)"
                     >
                         {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                         <span className="text-xs">导出报告</span>
                     </button>
                     <div className={`h-4 w-px ${theme.border.secondary}`}></div>
                     <Settings2 className="w-5 h-5 hover:text-white cursor-pointer" />
                     <Download className="w-5 h-5 hover:text-white cursor-pointer" />
                 </div>
             </div>
        </div>
      </div>

      {/* Right: Comments Sidebar */}
      <aside className={`w-[360px] ${theme.bg.secondary} border-l ${theme.border.primary} flex flex-col shrink-0 relative z-20`}>
         <div className={`h-14 border-b ${theme.border.primary} flex items-center px-4 justify-between ${theme.bg.secondary}`}>
             <span className="font-semibold text-sm text-zinc-200">批注 ({annotations.length})</span>
         </div>
         
         <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
             {isLoadingAnnotations ? (
               <div className="flex items-center justify-center py-8">
                 <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
               </div>
             ) : annotations.length === 0 ? (
               <div className="text-center py-8 text-zinc-500 text-sm">暂无批注</div>
             ) : (
               annotations.map((annotation, index) => (
                 <Comment 
                    key={annotation.id} 
                    annotation={annotation}
                    annotationIndex={index}
                    onJumpToTimecode={handleJumpToTimecode}
                 />
               ))
             )}
         </div>

         <div className={`p-4 border-t ${theme.border.primary} ${theme.bg.secondary}`}>
             <div className="relative">
                 <input 
                    type="text" 
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSubmittingAnnotation && handleAddComment()}
                    placeholder={`在 ${getCurrentTimecode()} 添加批注...`}
                    className={`w-full ${theme.bg.primary} border ${theme.border.primary} rounded-lg pl-4 pr-10 py-3 text-sm ${theme.text.secondary} focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all disabled:opacity-50`}
                    disabled={isSubmittingAnnotation}
                 />
                 <button 
                    onClick={handleAddComment}
                    className="absolute right-2 top-2 p-1 text-zinc-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
                    disabled={isSubmittingAnnotation || !commentInput.trim()}
                 >
                     {isSubmittingAnnotation ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : commentInput.trim() ? (
                       <Send className="w-4 h-4" />
                     ) : (
                       <Mic className="w-4 h-4" />
                     )}
                 </button>
             </div>
         </div>
      </aside>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteType('version');
        }}
        onConfirm={handleDeleteConfirm}
        title="确认删除"
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        loading={isDeleting}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              {versionCount > 1 ? (
                <>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                    该视频共有 {versionCount} 个版本，请选择删除方式：
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setDeleteType('version')}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        deleteType === 'version'
                          ? 'bg-red-500/10 border-red-500/50 text-red-400'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className="font-medium text-sm">删除该版本</div>
                      <div className="text-xs mt-0.5 opacity-70">仅删除当前版本（v{video?.version}）</div>
                    </button>
                    <button
                      onClick={() => setDeleteType('all')}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        deleteType === 'all'
                          ? 'bg-red-500/10 border-red-500/50 text-red-400'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50'
                      }`}
                    >
                      <div className="font-medium text-sm">删除该视频</div>
                      <div className="text-xs mt-0.5 opacity-70">删除所有 {versionCount} 个版本</div>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-300 leading-relaxed">
                  确定要删除该视频版本（v{video?.version}）吗？此操作不可恢复。
                </p>
              )}
            </div>
          </div>
        </div>
      </ConfirmModal>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl w-full max-w-md shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-500" />
                创建对外分享
              </h3>
              <button onClick={() => setShareModalOpen(false)}>
                <X className="w-5 h-5 text-zinc-500 hover:text-zinc-200" />
              </button>
            </div>

            <div className="p-5">
              {/* Warning Step - 历史版本警告 */}
              {shareStep === 'warning' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-200">
                      <p className="font-bold mb-1">您正在分享历史版本 (v{video?.version})</p>
                      <p className="opacity-80 text-xs">该视频不是最新版本。为了避免客户审阅错误的文件，强制分享需要填写说明。</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">分享原因 / 说明</label>
                    <textarea
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:border-indigo-500 outline-none resize-none h-24 placeholder-zinc-600"
                      placeholder="请说明为什么需要分享旧版本..."
                      value={shareJustification}
                      onChange={(e) => setShareJustification(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      disabled={!shareJustification.trim()}
                      onClick={() => setShareStep('config')}
                      className="bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      下一步
                    </button>
                  </div>
                </div>
              )}

              {/* Config Step - 配置分享选项 */}
              {shareStep === 'config' && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {/* 允许下载 */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-zinc-300">允许下载</span>
                      <button
                        onClick={() => setShareAllowDownload(!shareAllowDownload)}
                        className={`w-10 h-6 rounded-full transition-colors ${shareAllowDownload ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${shareAllowDownload ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>

                    {/* 密码保护 */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm text-zinc-300 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> 密码保护
                      </span>
                      <button
                        onClick={() => { setShareHasPassword(!shareHasPassword); setSharePassword(''); }}
                        className={`w-10 h-6 rounded-full transition-colors ${shareHasPassword ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${shareHasPassword ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>

                    {shareHasPassword && (
                      <div className="ml-6">
                        <input
                          type="text"
                          placeholder="设置访问密码"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 outline-none"
                          value={sharePassword}
                          onChange={(e) => setSharePassword(e.target.value)}
                        />
                      </div>
                    )}

                    {/* 链接有效期 */}
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">链接有效期</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShareExpiryOption('7days')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            shareExpiryOption === '7days' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          <Calendar className="w-4 h-4" /> 7 天有效
                        </button>
                        <button
                          onClick={() => setShareExpiryOption('permanent')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            shareExpiryOption === 'permanent' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          <Infinity className="w-4 h-4" /> 长期有效
                        </button>
                      </div>
                    </div>
                  </div>

                  {shareError && (
                    <p className="text-sm text-red-400 text-center">{shareError}</p>
                  )}

                  <button
                    onClick={handleGenerateShareLink}
                    disabled={shareIsLoading || (shareHasPassword && !sharePassword.trim())}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {shareIsLoading ? '生成中...' : '生成分享链接'}
                  </button>
                </div>
              )}

              {/* Success Step - 链接生成成功 */}
              {shareStep === 'success' && (
                <div className="space-y-5 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-zinc-100">分享链接已生成</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      此链接{shareExpiryOption === '7days' ? '有效期为 7 天' : '长期有效'}
                    </p>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-sm text-zinc-200 font-mono truncate">{shareGeneratedLink}</p>
                  </div>

                  <button
                    onClick={handleCopyShareLink}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      shareCopySuccess
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {shareCopySuccess ? (
                      <><Check className="w-4 h-4" /> 链接已复制</>
                    ) : (
                      <><Copy className="w-4 h-4" /> 复制链接</>
                    )}
                  </button>

                  <button
                    onClick={() => setShareModalOpen(false)}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    关闭窗口
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CommentProps {
  annotation: Annotation;
  annotationIndex: number;
  onJumpToTimecode: (timecode: string) => void;
}

const Comment: React.FC<CommentProps> = ({ annotation, annotationIndex, onJumpToTimecode }) => {
  const theme = useThemeClasses();
  const rawAnnotation = annotation as any;
  const displayName = annotation.user?.name || annotation.user?.email || rawAnnotation.clientName || annotation.client_name || '匿名用户';
  const userInitial = displayName.charAt(0).toUpperCase();
  const isActive = !(annotation.is_completed ?? annotation.isCompleted ?? false);
  
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
  const avatarBgClass = isGuest 
    ? 'bg-amber-900/50 border-amber-500/30 text-amber-300'
    : isTeamUser
      ? 'bg-indigo-900/50 border-indigo-500/30 text-indigo-300'
      : 'bg-emerald-900/50 border-emerald-500/30 text-emerald-300';
  
  const labelClass = isGuest
    ? 'text-amber-500/70'
    : isTeamUser
      ? 'text-indigo-500/70'
      : 'text-emerald-500/70';
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 根据用户类型确定内容背景色
  const contentBgClass = isGuest
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
    : isTeamUser
      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100'
      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100';

  return (
    <div className={`flex gap-3 group ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${avatarBgClass}`}>
            {userInitial}
        </div>
        <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1">
                <span className={`text-sm font-semibold flex items-center gap-1.5 ${
                  isGuest ? 'text-amber-300' : isTeamUser ? 'text-indigo-300' : 'text-emerald-300'
                }`}>
                  {displayName}
                  <span className={`text-[10px] font-normal ${labelClass}`}>
                    ({userTypeLabel})
                  </span>
                </span>
                <span className="text-[10px] text-zinc-500">{formatDateTime(annotation.created_at || annotation.createdAt || '')}</span>
            </div>
            <div className={`p-3 rounded-lg border text-sm leading-relaxed ${contentBgClass}`}>
                {annotation.content}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={() => onJumpToTimecode(annotation.timecode)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    annotationIndex === 0 
                      ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                      : 'text-zinc-500 bg-zinc-800/50 hover:bg-zinc-700/50'
                  }`}
                >
                  {annotation.timecode}
                </button>
                {(annotation.is_completed ?? annotation.isCompleted) && (
                  <span className="text-[10px] text-emerald-400">✓ 已处理</span>
                )}
            </div>
        </div>
    </div>
  );
};
