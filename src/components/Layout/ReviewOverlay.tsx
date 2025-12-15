
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Mic, SkipBack, Play, Pause, SkipForward, Settings2, Download, CheckCircle, Send, FileText, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../../App';
import { useThemeClasses } from '../../hooks/useThemeClasses';
import { annotationsApi, Annotation } from '../../api/annotations';
import { videosApi } from '../../api/videos';
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
            <button
                onClick={handleDeleteClick}
                className={`flex items-center gap-2 ${theme.text.tertiary} ${theme.text.hoverPrimary} ${theme.bg.secondary}/50 ${theme.bg.hover}/80 px-4 py-2 rounded-full backdrop-blur-md transition-all border border-white/5 hover:border-red-500/50 hover:text-red-400`}
                title="删除视频"
            >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">删除</span>
            </button>
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
  const userName = annotation.user?.name || annotation.user?.email || '匿名用户';
  const userInitial = userName.charAt(0).toUpperCase();
  const isActive = !(annotation.is_completed ?? annotation.isCompleted ?? false);
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 根据索引确定颜色方案
  // 第一个（索引0）：蓝色（indigo）
  // 第二个及以后：灰色（zinc）
  const isFirst = annotationIndex === 0;
  const avatarBgClass = isFirst 
    ? 'bg-indigo-900/50 border-indigo-500/30 text-indigo-300'
    : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-400';
  const contentBgClass = isFirst
    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-100'
    : `${theme.bg.tertiary}/50 ${theme.border.primary} ${theme.text.muted} opacity-70`;

  return (
    <div className={`flex gap-3 group ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${avatarBgClass}`}>
            {userInitial}
        </div>
        <div className="flex-1">
            <div className="flex items-baseline justify-between mb-1">
                <span className={`text-sm font-semibold ${isFirst ? 'text-indigo-300' : 'text-zinc-400'}`}>{userName}</span>
                <span className="text-[10px] text-zinc-500">{formatDateTime(annotation.created_at || annotation.createdAt || '')}</span>
            </div>
            <div className={`p-3 rounded-lg border text-sm leading-relaxed ${contentBgClass}`}>
                {annotation.content}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={() => onJumpToTimecode(annotation.timecode)}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    isFirst 
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
