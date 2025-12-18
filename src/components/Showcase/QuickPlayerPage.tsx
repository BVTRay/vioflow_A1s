import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Loader2, Lock, AlertCircle } from 'lucide-react';
import { showcaseApi } from '../../api/showcase';
import { videosApi } from '../../api/videos';

interface QuickPlayerPageData {
  id: string;
  title: string;
  mode: 'quick_player';
  videos: Array<{
    id: string;
    name: string;
    url: string;
    thumbnailUrl?: string;
    duration?: string;
  }>;
  hasPassword: boolean;
  expiredAt?: string;
}

export const QuickPlayerPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QuickPlayerPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!linkId) {
      setError('无效的链接');
      setLoading(false);
      return;
    }

    loadData();
  }, [linkId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const packageData = await showcaseApi.getByLinkId(linkId!);
      
      // 转换 API 数据为页面数据格式
      const pageData: QuickPlayerPageData = {
        id: packageData.id,
        title: packageData.title || '案例合集',
        mode: 'quick_player',
        videos: packageData.videos?.map((v: any) => ({
          id: v.id,
          name: v.name,
          url: v.storageUrl || v.storage_url || v.url,
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url,
          duration: v.duration
        })) || [],
        hasPassword: packageData.hasPassword || false,
        expiredAt: packageData.expiredAt || packageData.expired_at
      };
      
      setData(pageData);
      
      if (!pageData.hasPassword) {
        setIsPasswordVerified(true);
      }
      
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '加载失败';
      setError(typeof errorMessage === 'string' ? errorMessage : '加载失败');
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
      await showcaseApi.verifyPassword(linkId!, password);
      setIsPasswordVerified(true);
      setPasswordError('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || '密码错误';
      setPasswordError(typeof errorMessage === 'string' ? errorMessage : '密码错误');
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

  const handleNextVideo = () => {
    if (data && currentVideoIndex < data.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setIsPlaying(false);
    }
  };

  // 检查链接是否过期
  if (data && data.expiredAt) {
    const expiredDate = new Date(data.expiredAt);
    if (expiredDate < new Date()) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">链接已过期</h2>
            <p className="text-zinc-400">此案例包链接已过期，无法访问</p>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
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
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // 需要密码验证
  if (!isPasswordVerified) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-zinc-100 mb-1">需要输入密码</h2>
              <p className="text-zinc-500 text-sm">此案例包受密码保护，请输入密码以查看</p>
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
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
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
                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-lg font-medium transition-colors"
              >
                验证密码
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentVideo = data.videos[currentVideoIndex];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 纯净播放器 - 全屏显示 */}
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-full h-full relative">
          {currentVideo && (
            <>
              <video
                ref={videoRef}
                src={currentVideo.url}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  // 自动播放下一个视频
                  if (currentVideoIndex < data.videos.length - 1) {
                    setTimeout(() => {
                      handleNextVideo();
                      if (videoRef.current) {
                        videoRef.current.play();
                      }
                    }, 1000);
                  }
                }}
                playsInline
                controls={false}
              />

              {/* 播放/暂停按钮覆盖层 */}
              <div 
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}
                onClick={handlePlayPause}
              >
                <button
                  className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 hover:bg-violet-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white group-hover:scale-110 transition-transform" />
                  ) : (
                    <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>

              {/* 底部控制栏 - 仅在悬停或交互时显示 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6 opacity-0 hover:opacity-100 transition-opacity group">
                {/* 进度条 */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.5) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.5) 100%)`,
                    }}
                  />
                </div>

                {/* 控制按钮和时间 */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    <span className="text-zinc-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* 视频切换按钮（如果有多个视频） */}
                  {data.videos.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevVideo}
                        disabled={currentVideoIndex === 0}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        上一个
                      </button>
                      <span className="text-zinc-400 text-xs">
                        {currentVideoIndex + 1} / {data.videos.length}
                      </span>
                      <button
                        onClick={handleNextVideo}
                        disabled={currentVideoIndex === data.videos.length - 1}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        下一个
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

