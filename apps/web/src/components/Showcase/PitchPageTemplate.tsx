import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Globe } from 'lucide-react';

export interface PitchPageVideo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: string;
  description?: string;
}

export interface PitchPageTemplateProps {
  title: string;
  description: string;
  clientName?: string;
  contactInfo?: string;
  logoUrl?: string;
  videos: PitchPageVideo[];
  initialIndex?: number;
}

export const PitchPageTemplate: React.FC<PitchPageTemplateProps> = ({
  title,
  description,
  clientName,
  contactInfo,
  logoUrl,
  videos,
  initialIndex = 0
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentVideo = videos[currentVideoIndex];

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
    // 重置视频进度
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-200">
      {/* Header - 页眉 */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Logo 区域 */}
            {logoUrl ? (
              <div className="flex items-center gap-3">
                <img 
                  src={logoUrl} 
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
          {clientName && (
            <div className="inline-block mb-4">
              <span className="text-zinc-400 text-sm sm:text-base">To: </span>
              <span className="text-fuchsia-400 font-semibold text-lg sm:text-xl">{clientName}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100 mb-4 sm:mb-6">
            {title}
          </h1>
          {description && (
            <p className="text-zinc-400 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed whitespace-pre-wrap">
              {description}
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
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">{currentVideo.description}</p>
              )}
            </div>
          )}
        </div>

        {/* 视频列表 */}
        {videos.length > 1 && (
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-4 sm:mb-6">视频列表</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {videos.map((video, index) => (
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
        {contactInfo && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-4">联系方式</h2>
            <p className="text-zinc-400 text-sm sm:text-base whitespace-pre-wrap">{contactInfo}</p>
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

