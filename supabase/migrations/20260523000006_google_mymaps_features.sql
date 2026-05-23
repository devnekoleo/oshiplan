-- カスタムマーカーカラー & ライン描画機能
ALTER TABLE points
  ADD COLUMN IF NOT EXISTS marker_color TEXT;

-- 地図上に描くラインを管理するテーブル
CREATE TABLE IF NOT EXISTS map_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  day_id UUID REFERENCES map_days(id) ON DELETE SET NULL,
  name TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  width INTEGER NOT NULL DEFAULT 3,
  coordinates JSONB NOT NULL DEFAULT '[]', -- [[lng, lat], ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for map_lines
ALTER TABLE map_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "map_lines_owner" ON map_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM maps WHERE maps.id = map_lines.map_id AND maps.user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "map_lines_public_read" ON map_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM maps WHERE maps.id = map_lines.map_id AND maps.is_public = true));
