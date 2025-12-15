-- 添加 annotation_count 列到 videos 表
ALTER TABLE videos ADD COLUMN IF NOT EXISTS annotation_count integer DEFAULT 0;

-- 更新现有记录的 annotation_count（基于实际的批注数量）
UPDATE videos v
SET annotation_count = COALESCE((
  SELECT COUNT(*)
  FROM annotations a
  WHERE a.video_id = v.id
), 0);
