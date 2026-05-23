-- Mappin スキーマへの移行
-- 旧 Oshiplan テーブルを削除し、新テーブルを作成

-- 旧テーブル削除
DROP TABLE IF EXISTS affiliate_clicks CASCADE;
DROP TABLE IF EXISTS plan_records CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- users テーブルをシンプル化
ALTER TABLE users
  DROP COLUMN IF EXISTS home_station,
  DROP COLUMN IF EXISTS daily_ai_used,
  DROP COLUMN IF EXISTS daily_ai_reset_at;

-- maps テーブル（旅行マップ）
CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- points テーブル（マップ上のポイント）
CREATE TABLE IF NOT EXISTS points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- インデックス
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_maps_share_token ON maps(share_token);
CREATE INDEX IF NOT EXISTS idx_points_map_id ON points(map_id);
CREATE INDEX IF NOT EXISTS idx_points_order ON points(map_id, order_index);

-- RLS 有効化
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;

-- maps ポリシー
DROP POLICY IF EXISTS "maps: owner full access" ON maps;
CREATE POLICY "maps: owner full access" ON maps
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "maps: public readable" ON maps;
CREATE POLICY "maps: public readable" ON maps
  FOR SELECT USING (is_public = true);

-- points ポリシー
DROP POLICY IF EXISTS "points: owner full access" ON points;
CREATE POLICY "points: owner full access" ON points
  FOR ALL USING (
    map_id IN (SELECT id FROM maps WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "points: public map readable" ON points;
CREATE POLICY "points: public map readable" ON points
  FOR SELECT USING (
    map_id IN (SELECT id FROM maps WHERE is_public = true)
  );
