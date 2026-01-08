import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export interface QuickPlayerPageData {
  id?: string;
  title: string;
  mode: 'quick_player';
  videos: Array<{
    id: string;
    name: string;
    url: string;
    thumbnailUrl?: string;
    duration?: string;
  }>;
  hasPassword?: boolean;
  expiredAt?: string;
}

interface QuickPlayerViewerProps {
  data: QuickPlayerPageData;
}

export const QuickPlayerViewer: React.FC<QuickPlayerViewerProps> = ({ data }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimeout();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleVideoClick = () => {
    setShowControls(prev => !prev);
    resetControlsTimeout();
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
                onPlay={() => {
                  setIsPlaying(true);
                  resetControlsTimeout();
                }}
                onPause={() => {
                  setIsPlaying(false);
                  setShowControls(true);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  setShowControls(true);
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

              {/* 点击交互层 */}
              <div 
                className="absolute inset-0 z-10" 
                onClick={handleVideoClick}
              />

              {/* 播放按钮覆盖层 - 只在暂停时显示 */}
              {!isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer z-20 pointer-events-none"
                >
                  <button
                    className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 hover:bg-violet-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause();
                    }}
                  >
                    <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              )}

              {/* 底部控制栏 */}
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6 transition-opacity duration-300 z-30 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* 进度条 */}
                <div className="mb-4 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-zinc-700/50 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:h-3 transition-all"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.5) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(63, 63, 70, 0.5) 100%)`,
                    }}
                  />
                </div>

                {/* 控制按钮和时间 */}
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <button
                      onClick={handlePlayPause}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 sm:w-7 sm:h-7" />
                      ) : (
                        <Play className="w-6 h-6 sm:w-7 sm:h-7" />
                      )}
                    </button>
                    <span className="text-zinc-300 font-medium">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* 视频切换按钮（如果有多个视频） */}
                  {data.videos.length > 1 && (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <button
                        onClick={handlePrevVideo}
                        disabled={currentVideoIndex === 0}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        上一个
                      </button>
                      <span className="text-zinc-400 text-xs sm:text-sm hidden sm:inline">
                        {currentVideoIndex + 1} / {data.videos.length}
                      </span>
                      <button
                        onClick={handleNextVideo}
                        disabled={currentVideoIndex === data.videos.length - 1}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

