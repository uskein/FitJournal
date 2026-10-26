/**
 * Migración 005 — Planificador semanal de rutinas (Mi Semana)
 * - weekly_plans: una fila por semana ISO (lunes como inicio).
 * - weekly_plan_items: rutinas asignadas a días de la semana (1=lun..7=dom).
 */

const SQL_005 = `
CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL UNIQUE,
  week_end TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_items_plan ON weekly_plan_items(plan_id);
`;

export const migration005 = {
  version: 5,
  name: '005_weekly_plans',
  sql: SQL_005,
} as const;
