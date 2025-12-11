import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Download, Lock, AlertCircle, Loader2, X } from 'lucide-react';
import { sharesApi, ShareLinkDetail } from '../../api/shares';

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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (shareLink?.video?.storage_url) {
      window.open(shareLink.video.storage_url, '_blank');
    }
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
            {shareLink.allow_download && videoUrl && (
              <button
                onClick={handleDownload}
                className="ml-4 flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">下载</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
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
              {video?.version && (
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
      </main>
    </div>
  );
};

