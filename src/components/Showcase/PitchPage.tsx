import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Loader2, Lock, AlertCircle, MessageSquare, Mail, Phone, Globe } from 'lucide-react';
import { showcaseApi } from '../../api/showcase';
import { videosApi } from '../../api/videos';

interface PitchPageData {
  id: string;
  title: string;
  description: string;
  mode: 'pitch_page';
  clientName?: string;
  contactInfo?: string;
  logoUrl?: string;
  videos: Array<{
    id: string;
    name: string;
    url: string;
    thumbnailUrl?: string;
    duration?: string;
    description?: string;
  }>;
  hasPassword: boolean;
  expiredAt?: string;
}

export const PitchPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PitchPageData | null>(null);
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
      const pageData: PitchPageData = {
        id: packageData.id,
        title: packageData.title || '案例合集',
        description: packageData.description || packageData.welcomeMessage || '',
        mode: 'pitch_page',
        clientName: packageData.clientName,
        contactInfo: packageData.contactInfo,
        logoUrl: packageData.logoUrl || packageData.logo_url,
        videos: packageData.videos?.map((v: any, index: number) => ({
          id: v.id,
          name: v.name,
          url: v.storageUrl || v.storage_url || v.url,
          thumbnailUrl: v.thumbnailUrl || v.thumbnail_url,
          duration: v.duration,
          description: packageData.itemDescriptions?.[v.id] || v.description
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

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndex(index);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
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
          <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin mx-auto mb-4" />
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
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none transition-all"
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
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white py-3 rounded-lg font-medium transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200">
      {/* Header - 页眉 */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Logo 区域 */}
            {data.logoUrl ? (
              <div className="flex items-center gap-3">
                <img 
                  src={data.logoUrl} 
                  alt="Logo" 
                  className="h-8 sm:h-10 w-auto"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-fuchsia-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-semibold text-zinc-100">Vioflow</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* 欢迎语区域 */}
        <div className="mb-8 sm:mb-12 text-center">
          {data.clientName && (
            <div className="inline-block mb-4">
              <span className="text-zinc-400 text-sm sm:text-base">To: </span>
              <span className="text-fuchsia-400 font-semibold text-lg sm:text-xl">{data.clientName}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100 mb-4 sm:mb-6">
            {data.title}
          </h1>
          {data.description && (
            <p className="text-zinc-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* 视频播放器区域 */}
        <div className="mb-8 sm:mb-12">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="relative bg-black aspect-video">
              {currentVideo && (
                <>
                  <video
                    ref={videoRef}
                    src={currentVideo.url}
                    className="w-full h-full object-contain cursor-pointer"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setDuration(videoRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onClick={handlePlayPause}
                    playsInline
                  />

                  {/* 播放按钮覆盖层 - 只在暂停时显示 */}
                  {!isPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={handlePlayPause}
                    >
                      <button
                        className="w-16 h-16 sm:w-20 sm:h-20 bg-black/40 hover:bg-fuchsia-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
                      >
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 视频控制栏 */}
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
                    className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                    style={{
                      background: `linear-gradient(to right, #d946ef 0%, #d946ef ${duration ? (currentTime / duration) * 100 : 0}%, #3f3f46 ${duration ? (currentTime / duration) * 100 : 0}%, #3f3f46 100%)`,
                    }}
                  />
                  <span className="text-xs text-zinc-500 min-w-[40px]">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 当前视频信息 */}
          {currentVideo && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">{currentVideo.name}</h3>
              {currentVideo.description && (
                <p className="text-sm text-zinc-400">{currentVideo.description}</p>
              )}
            </div>
          )}
        </div>

        {/* 视频列表 */}
        {data.videos.length > 1 && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4 sm:mb-6">视频列表</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.videos.map((video, index) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoSelect(index)}
                  className={`bg-zinc-900 rounded-xl border overflow-hidden cursor-pointer transition-all ${
                    index === currentVideoIndex
                      ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="relative aspect-video bg-zinc-950">
                    {video.thumbnailUrl ? (
                      <img 
                        src={video.thumbnailUrl} 
                        alt={video.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-zinc-600" />
                      </div>
                    )}
                    {index === currentVideoIndex && (
                      <div className="absolute inset-0 bg-fuchsia-500/20 flex items-center justify-center">
                        <div className="bg-fuchsia-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          正在播放
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration || '--:--'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-zinc-200 mb-1 truncate">{video.name}</h3>
                    {video.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 联系方式 */}
        {data.contactInfo && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-4">联系方式</h2>
            <p className="text-zinc-400 text-sm sm:text-base">{data.contactInfo}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-900/30 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center">
          <p className="text-zinc-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} Vioflow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

