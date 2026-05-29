-- points テーブルに category カラムを追加
ALTER TABLE points
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'spot';
