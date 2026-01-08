-- 添加 annotation_count 列到 videos 表（如果不存在）
-- 这个脚本可以直接在 Supabase SQL Editor 中运行

ALTER TABLE videos ADD COLUMN IF NOT EXISTS annotation_count integer DEFAULT 0;

-- 更新现有记录的 annotation_count 为实际的批注数量
UPDATE videos 
SET annotation_count = (
  SELECT COUNT(*) 
  FROM annotations 
  WHERE annotations.video_id = videos.id
)
WHERE annotation_count = 0 OR annotation_count IS NULL;






