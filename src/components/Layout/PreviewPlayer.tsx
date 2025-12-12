
import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, X, Tag, Plus } from 'lucide-react';
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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
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
  };

  const progress = (currentTime / duration) * 100;

  return (
    <div className={`fixed inset-0 top-14 left-[384px] right-0 z-40 ${theme.bg.primary}/95 backdrop-blur-sm flex flex-col overflow-y-auto`}>
      <div className="w-full max-w-6xl mx-auto px-6 py-6">
        {/* Player Container - 靠顶部显示 */}
        <div className={`${theme.bg.secondary} rounded-xl border ${theme.border.primary} shadow-2xl overflow-hidden mb-6`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${theme.border.primary} flex items-center justify-between ${theme.bg.primary}`}>
            <div className="flex items-center gap-3">
              <h3 className={`text-sm font-semibold ${theme.text.secondary}`}>{video.name}</h3>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 ${theme.bg.tertiary} rounded-lg ${theme.text.muted} ${theme.text.hover} transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Video Area */}
          <div className="relative bg-black aspect-video">
            <img 
              src={`https://picsum.photos/seed/${video.id}/1920/1080`} 
              className="w-full h-full object-cover opacity-80" 
              alt="Preview"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handlePlayPause}
                className="w-20 h-20 bg-white/10 hover:bg-indigo-500/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all group"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-white text-white group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-8 h-8 fill-white text-white pl-1 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className={`px-6 py-4 ${theme.bg.primary} border-t ${theme.border.primary}`}>
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleTimeUpdate}
                className={`w-full h-1.5 ${theme.bg.tertiary} rounded-full appearance-none cursor-pointer accent-indigo-500`}
                style={{
                  background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${progress}%, rgb(39, 39, 42) ${progress}%, rgb(39, 39, 42) 100%)`
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                  className={`p-2 ${theme.bg.tertiary} rounded-lg ${theme.text.muted} ${theme.text.hoverPrimary} transition-colors`}
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className={`p-2 ${theme.bg.tertiary} rounded-lg ${theme.text.muted} ${theme.text.hoverPrimary} transition-colors`}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
                  className={`p-2 ${theme.bg.tertiary} rounded-lg ${theme.text.muted} ${theme.text.hoverPrimary} transition-colors`}
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 ml-4">
                  <Volume2 className={`w-4 h-4 ${theme.text.muted}`} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="100"
                    className={`w-20 h-1 ${theme.bg.tertiary} rounded-full appearance-none cursor-pointer accent-indigo-500`}
                  />
                </div>
                <span className={`text-xs font-mono ${theme.text.muted} ml-4`}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button className={`p-2 ${theme.bg.hover} rounded-lg ${theme.text.muted} ${theme.text.hoverPrimary} transition-colors`}>
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 标签区域 - 显示在播放器下方 */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl p-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 标签列表 */}
            <div className="flex flex-wrap gap-2 items-center flex-1">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-500 text-white border-indigo-400'
                      : `${theme.bg.secondary} ${theme.text.muted} ${theme.border.secondary} ${theme.border.hover}`
                  }`}
                >
                  {selectedTags.includes(tag) ? '✓ ' : ''}{tag}
                </button>
              ))}
              {/* 已选中的自定义标签（不在 availableTags 中） */}
              {selectedTags.filter(tag => !availableTags.includes(tag)).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className="px-2.5 py-1 rounded-full text-[10px] border transition-colors bg-indigo-500 text-white border-indigo-400"
                >
                  ✓ {tag}
                </button>
              ))}
            </div>
            
            {/* 添加自定义标签输入框和按钮 */}
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
                className={`w-20 px-2.5 py-1 ${theme.bg.primary} border ${theme.border.primary} rounded-full text-[10px] ${theme.text.secondary} focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none placeholder-zinc-600`}
              />
              <button
                onClick={handleAddCustomTag}
                className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${theme.bg.secondary} ${theme.text.muted} ${theme.border.secondary} ${theme.border.hover} ${theme.text.hover} flex items-center gap-1`}
              >
                <Plus className="w-3 h-3" />
                添加
              </button>
              <button
                onClick={handleSubmitTags}
                className="px-2.5 py-1 rounded-full text-[10px] border transition-colors bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 flex items-center gap-1.5 shrink-0"
              >
                <Tag className="w-3 h-3" />
                提交标签
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

