/**
 * Migración 001 — Esquema inicial completo
 * Fuente de verdad: MODELO_DE_DATOS.md §2
 * Contenido: diario creativo · hábitos/metas · gimnasio · media · sistema · FTS5
 * Nota: en runtime RN el SQL vive en TS (no hay loader raw .sql en Metro).
 */

const SQL_001 = `
PRAGMA foreign_keys = ON;

-- ============ DIARIO ============
CREATE TABLE IF NOT EXISTS diary_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date    TEXT NOT NULL UNIQUE,
  mood          INTEGER CHECK(mood BETWEEN 1 AND 5),
  energy        INTEGER CHECK(energy BETWEEN 1 AND 5),
  sleep_hours   REAL CHECK(sleep_hours >= 0 AND sleep_hours <= 24),
  body_weight   REAL,
  weather       TEXT,
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS diary_entry_tags (
  entry_id INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE TABLE IF NOT EXISTS mood_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id   INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  emotion    TEXT NOT NULL,
  intensity  INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 5),
  context    TEXT
);

CREATE TABLE IF NOT EXISTS gratitude_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id   INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  text       TEXT NOT NULL CHECK(length(text) <= 500),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wellness_metrics (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id  INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  metric    TEXT NOT NULL,
  value     REAL,
  unit      TEXT
);

CREATE TABLE IF NOT EXISTS word_of_day (
  entry_id INTEGER PRIMARY KEY REFERENCES diary_entries(id) ON DELETE CASCADE,
  word     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_colors (
  entry_id INTEGER PRIMARY KEY REFERENCES diary_entries(id) ON DELETE CASCADE,
  color    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audio_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id   INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  file_path  TEXT NOT NULL,
  duration_s INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sketches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id   INTEGER NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  strokes    TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL
);

-- ============ HÁBITOS Y METAS ============
CREATE TABLE IF NOT EXISTS habits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  icon       TEXT,
  color      TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  done     INTEGER NOT NULL DEFAULT 0,
  UNIQUE(habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS goals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  target_date TEXT,
  progress    REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goal_logs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id  INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  note     TEXT
);

-- ============ PLANTILLAS GUIADAS ============
CREATE TABLE IF NOT EXISTS journal_templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  questions  TEXT NOT NULL,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_prompts (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  text  TEXT NOT NULL,
  theme TEXT
);

-- ============ GIMNASIO ============
CREATE TABLE IF NOT EXISTS exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  muscle_primary   TEXT NOT NULL,
  muscle_secondary TEXT,
  equipment        TEXT,
  type             TEXT,
  instructions     TEXT,
  is_custom        INTEGER NOT NULL DEFAULT 0,
  is_archived      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS routines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id    INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id   INTEGER NOT NULL REFERENCES exercises(id),
  order_index   INTEGER NOT NULL,
  target_sets   INTEGER,
  target_reps   INTEGER,
  target_weight REAL,
  rest_seconds  INTEGER,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id   INTEGER REFERENCES routines(id),
  session_date TEXT NOT NULL,
  started_at   TEXT,
  finished_at  TEXT,
  duration_min INTEGER,
  notes        TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,
  notes       TEXT
);

CREATE TABLE IF NOT EXISTS session_sets (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,
  weight              REAL,
  reps                INTEGER,
  rpe                 REAL CHECK(rpe >= 1 AND rpe <= 10),
  is_completed        INTEGER NOT NULL DEFAULT 0,
  is_pr               INTEGER NOT NULL DEFAULT 0,
  rest_seconds        INTEGER
);

-- ============ FOTOS (filesystem + metadatos) ============
CREATE TABLE IF NOT EXISTS photos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('diary','session')),
  owner_id   INTEGER NOT NULL,
  file_path  TEXT NOT NULL,
  thumb_path TEXT,
  width      INTEGER,
  height     INTEGER,
  created_at TEXT NOT NULL
);

-- ============ SISTEMA ============
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ============ ÍNDICES ============
CREATE INDEX IF NOT EXISTS idx_photos_owner       ON photos(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date      ON workout_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_session_ex         ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sets_ex    ON session_sets(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_ex_routine ON routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs         ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_mood_entries       ON mood_entries(entry_id);

-- ============ BÚSQUEDA FULL-TEXT ============
CREATE VIRTUAL TABLE IF NOT EXISTS diary_fts USING fts5(
  notes,
  content='diary_entries',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS exercises_fts USING fts5(
  name, muscle_primary, instructions,
  content='exercises',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS diary_ai AFTER INSERT ON diary_entries BEGIN
  INSERT INTO diary_fts(rowid, notes) VALUES (new.id, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS diary_ad AFTER DELETE ON diary_entries BEGIN
  INSERT INTO diary_fts(diary_fts, rowid, notes) VALUES ('delete', old.id, old.notes);
END;
CREATE TRIGGER IF NOT EXISTS diary_au AFTER UPDATE ON diary_entries BEGIN
  INSERT INTO diary_fts(diary_fts, rowid, notes) VALUES ('delete', old.id, old.notes);
  INSERT INTO diary_fts(rowid, notes) VALUES (new.id, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS exercises_ai AFTER INSERT ON exercises BEGIN
  INSERT INTO exercises_fts(rowid, name, muscle_primary, instructions)
  VALUES (new.id, new.name, new.muscle_primary, new.instructions);
END;
CREATE TRIGGER IF NOT EXISTS exercises_ad AFTER DELETE ON exercises BEGIN
  INSERT INTO exercises_fts(exercises_fts, rowid, name, muscle_primary, instructions)
  VALUES ('delete', old.id, old.name, old.muscle_primary, old.instructions);
END;
CREATE TRIGGER IF NOT EXISTS exercises_au AFTER UPDATE ON exercises BEGIN
  INSERT INTO exercises_fts(exercises_fts, rowid, name, muscle_primary, instructions)
  VALUES ('delete', old.id, old.name, old.muscle_primary, old.instructions);
  INSERT INTO exercises_fts(rowid, name, muscle_primary, instructions)
  VALUES (new.id, new.name, new.muscle_primary, new.instructions);
END;
`;

export const migration001 = {
  version: 1,
  name: '001_init',
  sql: SQL_001,
} as const;
