import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export interface QuickPlayerVideo {
  id: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: string;
}

export interface QuickPlayerTemplateProps {
  videos: QuickPlayerVideo[];
  initialIndex?: number;
}

export const QuickPlayerTemplate: React.FC<QuickPlayerTemplateProps> = ({ 
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

  const handleNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
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

  if (!currentVideo) return null;

  return (
    <div className="w-full h-full bg-black text-white relative flex flex-col">
      {/* 纯净播放器 - 全屏显示 */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className="w-full h-full relative">
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
              if (currentVideoIndex < videos.length - 1) {
                setTimeout(() => {
                  handleNextVideo();
                  // 注意：自动播放可能被浏览器阻止，但在同一个用户交互上下文中通常是允许的
                  // 这里我们只是尝试，如果不行用户需要手动点击
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(() => {});
                    }
                  }, 100);
                }, 1000);
              }
            }}
            onClick={handlePlayPause}
            playsInline
            controls={false}
          />

          {/* 播放按钮覆盖层 - 只在暂停时显示 */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
              onClick={handlePlayPause}
            >
              <button
                className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 hover:bg-violet-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
              >
                <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}

          {/* 底部控制栏 - 仅在悬停或交互时显示 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6 opacity-0 hover:opacity-100 transition-opacity group z-20">
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
              {videos.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevVideo}
                    disabled={currentVideoIndex === 0}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    上一个
                  </button>
                  <span className="text-zinc-400 text-xs">
                    {currentVideoIndex + 1} / {videos.length}
                  </span>
                  <button
                    onClick={handleNextVideo}
                    disabled={currentVideoIndex === videos.length - 1}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    下一个
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

