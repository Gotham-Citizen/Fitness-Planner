DROP TABLE IF EXISTS workout_session_sets;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS workout_list_exercises;
DROP TABLE IF EXISTS workout_lists;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS bodyweight_log;

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
  difficulty INTEGER NOT NULL DEFAULT 1,
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

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  gender TEXT,
  name TEXT,
  bodyweight REAL,
  bodyweight_unit TEXT NOT NULL DEFAULT 'kg',
  target_weight REAL,
  effort_scale TEXT NOT NULL DEFAULT 'rir',
  timer_sound TEXT NOT NULL DEFAULT 'beep',
  timer_sound_on INTEGER NOT NULL DEFAULT 1,
  timer_vibrate INTEGER NOT NULL DEFAULT 1,
  timer_flash INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'en'
);

CREATE UNIQUE INDEX idx_users_email ON users (email);

CREATE TABLE workout_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_wl_user ON workout_lists (user_id);

CREATE UNIQUE INDEX idx_wl_user_name_nocase ON workout_lists (user_id, name COLLATE NOCASE) WHERE deleted_at IS NULL;

CREATE TABLE workout_list_exercises (
  list_id TEXT NOT NULL REFERENCES workout_lists (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  rest_secs INTEGER NOT NULL DEFAULT 60,
  rest_enabled INTEGER NOT NULL DEFAULT 1,
  rir_enabled INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (list_id, exercise_id)
);

CREATE INDEX idx_wle_exercise ON workout_list_exercises (exercise_id);

CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES workout_lists (id) ON DELETE CASCADE,
  list_name TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  bodyweight REAL,
  bodyweight_unit TEXT NOT NULL DEFAULT 'kg'
);

CREATE INDEX idx_ws_list ON workout_sessions (list_id);

CREATE TABLE workout_session_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  weight_unit TEXT NOT NULL DEFAULT 'lbs',
  rir REAL,
  effort_scale TEXT NOT NULL DEFAULT 'rir'
);

CREATE INDEX idx_wss_session ON workout_session_sets (session_id);
CREATE INDEX idx_wss_exercise ON workout_session_sets (exercise_id);

CREATE TABLE bodyweight_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  weight REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  logged_at TEXT NOT NULL
);

CREATE INDEX idx_bw_user_date ON bodyweight_log (user_id, logged_at);