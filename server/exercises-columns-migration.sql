-- One-time migration for the remote D1 database (fitness-db), applied 2026-10-20.
-- The remote exercises table predates these schema.sql columns:
--   name_pinyin, name_initials (pinyin search fields), difficulty.
-- Fresh databases already get all of these from schema.sql + seed.sql.
-- Do not re-run: SQLite ALTER TABLE ADD COLUMN fails once the columns exist.

ALTER TABLE exercises ADD COLUMN name_pinyin TEXT;
ALTER TABLE exercises ADD COLUMN name_initials TEXT;
ALTER TABLE exercises ADD COLUMN difficulty INTEGER NOT NULL DEFAULT 1;

-- Backfill difficulty with the same deterministic formula as
-- scripts/generate-seed.mjs (assignDifficulty): id % 10 <= 3 -> 1, <= 7 -> 2, else 3.
UPDATE exercises SET difficulty = CASE
  WHEN CAST(id AS INTEGER) % 10 <= 3 THEN 1
  WHEN CAST(id AS INTEGER) % 10 <= 7 THEN 2
  ELSE 3
END;
