
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Maximize2, X, Tag, Plus } from 'lucide-react';
import { useStore } from '../../App';
import { Video } from '../../types';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface PreviewPlayerProps {
  video: Video;
  onClose: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ video, onClose }) => {
  const { dispatch, state } = useStore();
  const theme = useThemeClasses();
  const currentVideo = state.videos.find(v => v.id === video.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300); // Mock duration in seconds
  const [selectedTags, setSelectedTags] = useState<string[]>(currentVideo?.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 获取系统内既有的标签（从 state.tags 获取，这是从 API 获取的真实标签数据）
  const apiTags = state.tags.map(t => t.name);
  const existingTags = Array.from(new Set(state.videos.flatMap(v => v.tags || []))).filter(Boolean);
  const availableTags = Array.from(new Set([...apiTags, ...existingTags]));

  // 同步标签状态
  useEffect(() => {
    if (currentVideo?.tags) {
      setSelectedTags(currentVideo.tags);
    }
  }, [currentVideo?.tags]);

  // 检测视频方向（模拟，实际应从视频元数据获取）
  useEffect(() => {
    // 这里可以根据实际视频尺寸判断，暂时使用默认横屏
    setVideoOrientation('landscape');
  }, [video]);

  // 控制栏自动隐藏逻辑
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const handleTimeUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
    setShowControls(true);
  };

  const handleVideoAreaMouseMove = () => {
    setShowControls(true);
  };

  const handleVideoAreaMouseLeave = () => {
    if (!isPlaying) {
      setShowControls(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
  };

  const handleAddCustomTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed) && !availableTags.includes(trimmed)) {
      const newTags = [...selectedTags, trimmed];
      setSelectedTags(newTags);
      setNewTagInput('');
    } else if (trimmed && availableTags.includes(trimmed)) {
      // 如果标签已存在，直接切换
      handleToggleTag(trimmed);
      setNewTagInput('');
    }
  };

  const handleSubmitTags = () => {
    dispatch({ type: 'UPDATE_VIDEO_TAGS', payload: { videoId: video.id, tags: selectedTags } });
    onClose();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoAreaRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const progress = (currentTime / duration) * 100;

  return (
    <div className={`fixed inset-0 top-14 left-[384px] right-0 z-40 ${theme.bg.primary}/95 backdrop-blur-sm flex flex-col overflow-hidden`}>
      <div className={`flex ${videoOrientation === 'landscape' ? 'flex-col' : 'flex-row'} w-full h-full`}>
        {/* 播放器容器 - 无边框沉浸式设计 */}
        <div 
          ref={videoAreaRef}
          className={`relative bg-black ${videoOrientation === 'landscape' ? 'flex-1' : 'w-2/3'} flex items-center justify-center`}
          onMouseMove={handleVideoAreaMouseMove}
          onMouseLeave={handleVideoAreaMouseLeave}
          onClick={handlePlayPause}
        >
          {/* 视频画面 */}
          <img 
            src={`https://picsum.photos/seed/${video.id}/1920/1080`} 
            className="w-full h-full object-contain" 
            alt="Preview"
          />

          {/* 顶部悬浮栏 */}
          <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* 文件名 - 左上角 */}
            <div className="text-white text-sm font-sans font-medium drop-shadow-lg">
              {video.name}
            </div>
            
            {/* 关闭按钮 - 右上角 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* 底部悬浮控制栏 - 带渐变阴影 */}
          <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* 渐变阴影层 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            
            {/* 控制内容 */}
            <div className="relative px-4 pb-4">
              {/* 进度条 - 最底部 */}
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleTimeUpdate}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${progress}%, rgba(255, 255, 255, 0.2) ${progress}%, rgba(255, 255, 255, 0.2) 100%)`
                  }}
                />
              </div>

              {/* 播放控制 */}
              <div className="flex items-center justify-between">
                {/* 左侧：播放/暂停、音量 */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause();
                    }}
                    className="w-8 h-8 flex items-center justify-center text-white hover:text-indigo-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-white" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${volume}%, rgba(255, 255, 255, 0.2) ${volume}%, rgba(255, 255, 255, 0.2) 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* 中间：时间码 */}
                <div className="text-white text-xs font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* 右侧：全屏 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFullscreen();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-indigo-400 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* 标签管理面板 - 位于视频下方（横屏）或右侧（竖屏） */}
        <div className={`${theme.bg.secondary} ${videoOrientation === 'landscape' ? 'h-32' : 'w-1/3 h-full'} flex items-center px-6 py-4 border-t ${theme.border.primary}`}>
          <div className="flex items-center gap-4 w-full">
            {/* 标签池 - 左侧 */}
            <div className="flex flex-wrap gap-2 items-center flex-1 overflow-y-auto max-h-full">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-500 text-white border border-indigo-400'
                      : `bg-transparent ${theme.text.muted} border ${theme.border.secondary} ${theme.border.hover}`
                  }`}
                >
                  {tag}
                </button>
              ))}
              {/* 已选中的自定义标签（不在 availableTags 中） */}
              {selectedTags.filter(tag => !availableTags.includes(tag)).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500 text-white border border-indigo-400 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            
            {/* 操作区 - 右侧 */}
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomTag();
                  }
                }}
                placeholder="新标签"
                className={`w-24 px-3 py-1.5 ${theme.bg.primary} border ${theme.border.primary} rounded-full text-xs ${theme.text.secondary} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder:${theme.text.muted.replace('text-', '')}`}
              />
              <button
                onClick={handleAddCustomTag}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${theme.bg.secondary} ${theme.text.muted} ${theme.border.secondary} ${theme.border.hover} ${theme.text.hover} flex items-center gap-1.5`}
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
              <button
                onClick={handleSubmitTags}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Tag className="w-3.5 h-3.5" />
                提交标签
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

