import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Download, Lock, AlertCircle, Loader2, X, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { sharesApi, ShareLinkDetail } from '../../api/shares';
import { annotationsApi, Annotation } from '../../api/annotations';

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
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

  useEffect(() => {
    if (!token) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }

    loadShareLink();
  }, [token]);

  const loadShareLink = async () => {
    try {
      setLoading(true);
      const data = await sharesApi.getByToken(token!);
      
      if ((data as any).error) {
        setError((data as any).error);
        setLoading(false);
        return;
      }

      setShareLink(data);
      
      // 如果没有密码，直接验证通过
      if (!data.password_hash) {
        setIsPasswordVerified(true);
      }
      
      // 如果是审阅类型，加载批注
      if (data.type === 'video_review' && data.video_id) {
        loadAnnotations();
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
      const response = await sharesApi.verifyPassword(token!, password);

      if ((response as any).error) {
        setPasswordError((response as any).error);
        return;
      }

      setIsPasswordVerified(true);
      setPasswordError('');
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

  const handleDownload = () => {
    if (shareLink?.video?.storage_url) {
      window.open(shareLink.video.storage_url, '_blank');
    }
  };

  // 加载批注
  const loadAnnotations = async () => {
    if (!token) return;
    try {
      const data = await annotationsApi.getByShareToken(token);
      if (Array.isArray(data)) {
        setAnnotations(data);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  // 添加批注
  const handleAddAnnotation = async () => {
    if (!annotationInput.trim() || !token || !videoRef.current) return;

    setIsSubmittingAnnotation(true);
    try {
      // 获取当前播放时间并转换为时间码格式 (HH:MM:SS)
      const time = videoRef.current.currentTime;
      const hours = Math.floor(time / 3600);
      const minutes = Math.floor((time % 3600) / 60);
      const seconds = Math.floor(time % 60);
      const timecode = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const result = await annotationsApi.createByShareToken(token, {
        timecode,
        content: annotationInput.trim(),
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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">需要密码</h2>
            <p className="text-zinc-400 text-sm">此分享链接受密码保护，请输入密码以继续</p>
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
                placeholder="请输入密码"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-indigo-500 outline-none"
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
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
    );
  }

  const video = shareLink.video;
  const project = shareLink.project;
  const videoUrl = video?.storage_url;
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
              {shareLink.allow_download && videoUrl && (
                <button
                  onClick={handleDownload}
                  className="ml-2 flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">下载</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${isReviewMode && showAnnotations ? 'flex gap-6' : ''}`}>
        <div className={`space-y-6 ${isReviewMode && showAnnotations ? 'flex-1' : 'w-full'}`}>
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

                {/* Play/Pause Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={handlePlayPause}
                    className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 bg-white/10 hover:bg-indigo-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
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
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
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
                  <span className="text-zinc-200 ml-2">{video.size}</span>
                </div>
              )}
              {video?.duration && (
                <div>
                  <span className="text-zinc-500">时长：</span>
                  <span className="text-zinc-200 ml-2">{video.duration}</span>
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
          <aside className="w-full sm:w-80 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col shrink-0 h-[calc(100vh-200px)]">
            <div className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-950 rounded-t-xl">
              <span className="font-semibold text-sm text-zinc-200">批注 ({annotations.length})</span>
              <button
                onClick={() => setShowAnnotations(false)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {annotations.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无批注</p>
                </div>
              ) : (
                annotations.map((annotation) => (
                  <div key={annotation.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-300">
                      {annotation.user?.name?.charAt(0) || '客'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-semibold text-zinc-200">
                          {annotation.user?.name || '客户'}
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
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-xl">
              <div className="relative">
                <input
                  type="text"
                  value={annotationInput}
                  onChange={(e) => setAnnotationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddAnnotation()}
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
            </div>
          </aside>
        )}
      </main>
    </div>
  );
};

