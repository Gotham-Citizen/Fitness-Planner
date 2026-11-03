-- Fitness Planner — Cloudflare D1 (SQLite) schema.
--
-- DESTRUCTIVE RESET: the DROP block below wipes every table. Only run this
-- against fresh/disposable databases — local Miniflare via
-- `npm run db:schema:local`, or a brand-new remote D1 via
-- `npm run db:schema:remote`. Existing remote databases already carry every
-- column and keep working unchanged; never re-run this against them.
--
-- Layout rules:
--   * Tables appear in dependency order (referenced tables first); the DROP
--     block is the exact reverse, so a re-apply always cleans up.
--   * CHECK constraints mirror the app-side normalizers (shared/normalize.js
--     and server/db.js) so bad rows fail loudly at the database too.

-- ---------- reset (reverse dependency order) ----------
DROP TABLE IF EXISTS workout_session_sets;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS workout_list_exercises;
DROP TABLE IF EXISTS workout_lists;
DROP TABLE IF EXISTS bodyweight_log;
DROP TABLE IF EXISTS exercise_media;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;

-- ---------- users ----------
-- Identity + preferences. `questionnaire` holds the normalized registration
-- answers as JSON ({ goal, experience, daysPerWeek, equipment, sessionMinutes? },
-- see normalizeQuestionnaire in server/db.js); `bodyweight` mirrors the latest
-- weigh-in while the trend itself lives in bodyweight_log.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  name TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'zh')),
  bodyweight REAL CHECK (bodyweight IS NULL OR bodyweight >= 0),
  bodyweight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (bodyweight_unit IN ('kg', 'lbs')),
  target_weight REAL CHECK (target_weight IS NULL OR target_weight >= 0),
  effort_scale TEXT NOT NULL DEFAULT 'rir' CHECK (effort_scale IN ('rir', 'rpe')),
  timer_sound TEXT NOT NULL DEFAULT 'beep' CHECK (timer_sound IN ('off', 'beep', 'chime', 'bell')),
  timer_sound_on INTEGER NOT NULL DEFAULT 1 CHECK (timer_sound_on IN (0, 1)),
  timer_vibrate INTEGER NOT NULL DEFAULT 1 CHECK (timer_vibrate IN (0, 1)),
  timer_flash INTEGER NOT NULL DEFAULT 0 CHECK (timer_flash IN (0, 1)),
  questionnaire TEXT,
  questionnaire_updated_at TEXT,
  -- Plan & schedule: { mode: 'fixed'|'rotation', weekStartsOn: 0-6,
  -- fixed: { <0-6 weekday>: listId|null }, rotation: [ { type:'workout',
  -- listId } | { type:'rest' } ], rotationStartedAt: 'YYYY-MM-DD' } — see
  -- normalizeSchedule in server/db.js.
  schedule TEXT
);

-- ---------- exercises ----------
-- Shared seed library (user_id NULL) + per-user custom exercises. Text fields
-- secondary_muscles / instructions / instruction_steps hold JSON; the zh
-- name/pinyin/initials columns power Chinese search. `difficulty` is the
-- 1–3 easy/medium/hard band shown in the library.
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_zh TEXT,
  name_pinyin TEXT,
  name_initials TEXT,
  category TEXT NOT NULL,
  target TEXT NOT NULL,
  equipment TEXT NOT NULL,
  muscle_group TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  secondary_muscles TEXT NOT NULL DEFAULT '[]',
  image TEXT,
  gif_url TEXT,
  instructions TEXT NOT NULL DEFAULT '{}',
  instruction_steps TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_exercises_category ON exercises (category);
CREATE INDEX idx_exercises_target ON exercises (target);
CREATE INDEX idx_exercises_user ON exercises (user_id);

-- Uploaded custom-exercise GIFs. GIF bytes live base64-encoded in `data`
-- (raw uploads capped at 1.4 MB so the row stays under D1's 2 MB row limit
-- after base64 inflation). `exercises.gif_url` references a row through the
-- public /api/media/<id> route; the row is deleted with the exercise.
CREATE TABLE exercise_media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_exercise_media_user ON exercise_media (user_id);

-- ---------- workout lists (planner) ----------
CREATE TABLE workout_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_wl_user ON workout_lists (user_id);

-- One live list per (user, name); deleted lists free the name up again.
CREATE UNIQUE INDEX idx_wl_user_name_nocase ON workout_lists (user_id, name COLLATE NOCASE) WHERE deleted_at IS NULL;

-- Exercises placed in a list, with per-exercise settings. prescribed_sets /
-- prescribed_reps carry preset-plan guidance (e.g. 4 × "6-8"); both stay NULL
-- for freely planned exercises.
CREATE TABLE workout_list_exercises (
  list_id TEXT NOT NULL REFERENCES workout_lists (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  rest_secs INTEGER NOT NULL DEFAULT 60 CHECK (rest_secs >= 0),
  rest_enabled INTEGER NOT NULL DEFAULT 1 CHECK (rest_enabled IN (0, 1)),
  rir_enabled INTEGER NOT NULL DEFAULT 0 CHECK (rir_enabled IN (0, 1)),
  prescribed_sets INTEGER CHECK (prescribed_sets IS NULL OR prescribed_sets > 0),
  prescribed_reps TEXT,
  -- Manual ordering (drag-to-reorder in Edit workout). 1-based sequential ints,
  -- never 0 once assigned. Fresh databases get it here; existing ones receive
  -- it from ensureListExercisePosition() in server/db.js, which backfills every
  -- row's position from the legacy `added_at` insertion order.
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (list_id, exercise_id)
);

CREATE INDEX idx_wle_exercise ON workout_list_exercises (exercise_id);

-- ---------- workout sessions (history) ----------
-- `list_name` / `bodyweight` are intentional snapshots: history keeps the
-- list's name after renames and the user's weight at training time.
-- Sessions are hard-deleted with their list (workout_lists ON DELETE CASCADE).
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES workout_lists (id) ON DELETE CASCADE,
  list_name TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  bodyweight REAL CHECK (bodyweight IS NULL OR bodyweight >= 0),
  bodyweight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (bodyweight_unit IN ('kg', 'lbs'))
);

CREATE INDEX idx_ws_list ON workout_sessions (list_id);

-- Sets logged inside a session. `rir` is the canonical effort rating
-- (NULL = unrated, 0 = failure, capped at 10); `effort_scale` records the
-- scale the set was logged with — NULL means a legacy row that predates the
-- per-set scale and renders as RIR. Weight 0 marks bodyweight moves.
CREATE TABLE workout_session_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number >= 1),
  reps INTEGER CHECK (reps IS NULL OR reps >= 0),
  weight REAL CHECK (weight IS NULL OR weight >= 0),
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  rir REAL CHECK (rir IS NULL OR (rir >= 0 AND rir <= 10)),
  effort_scale TEXT CHECK (effort_scale IS NULL OR effort_scale IN ('rir', 'rpe'))
);

CREATE INDEX idx_wss_session ON workout_session_sets (session_id);
CREATE INDEX idx_wss_exercise ON workout_session_sets (exercise_id);

-- ---------- weigh-ins (bodyweight trend) ----------
CREATE TABLE bodyweight_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  weight REAL NOT NULL CHECK (weight >= 0),
  unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs')),
  logged_at TEXT NOT NULL
);

CREATE INDEX idx_bw_user_date ON bodyweight_log (user_id, logged_at);
