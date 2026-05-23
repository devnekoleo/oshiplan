-- Day management per map
CREATE TABLE IF NOT EXISTS map_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL,
  date DATE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(map_id, day_number)
);

-- Add day_id and time fields to existing points table
ALTER TABLE points
  ADD COLUMN IF NOT EXISTS day_id UUID REFERENCES map_days(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;

-- Checklist items per map
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'item', -- 'packing' | 'todo'
  label TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for map_days
ALTER TABLE map_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "map_days_owner" ON map_days FOR ALL
  USING (EXISTS (SELECT 1 FROM maps WHERE maps.id = map_days.map_id AND maps.user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "map_days_public_read" ON map_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM maps WHERE maps.id = map_days.map_id AND maps.is_public = true));

-- RLS for checklist_items
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "checklist_owner" ON checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM maps WHERE maps.id = checklist_items.map_id AND maps.user_id = auth.uid()));
