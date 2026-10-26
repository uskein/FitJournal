import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';

/**
 * weeklyPlanRepository — "Mi Semana" (planificador de rutinas por semana).
 * Reglas:
 *  - week_start = lunes ISO de la semana (UNIQUE: 1 plan por semana).
 *  - Cada item asigna una rutina a un día (1=lun … 7=dom).
 *  - El progreso semanal se calcula cruzando workout_sessions del rango.
 */

export interface WeeklyPlan {
  id: number;
  weekStart: string;
  weekEnd: string;
  label: string | null;
}

export interface WeeklyPlanItem {
  id: number;
  planId: number;
  routineId: number;
  routineName: string;
  dayOfWeek: number;
  notes: string | null;
}

export interface WeekProgress {
  /** Sesiones finalizadas por fecha ISO de la semana */
  completedDates: string[];
  /** Rutinas completadas (por nombre) */
  completedRoutines: string[];
  totalSessions: number;
  totalSets: number;
  totalVolume: number;
  plannedCount: number;
  completedCount: number;
  completionPct: number;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function dayName(day: number): string {
  return DAY_NAMES[day - 1] ?? '?';
}

/** Lunes ISO (1=lunes) de una fecha dada */
export function mondayOf(isoDate: string): { start: string; end: string } {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 0=lun
  dt.setDate(dt.getDate() - dow);
  const start = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const endDt = new Date(dt);
  endDt.setDate(dt.getDate() + 6);
  const end = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, '0')}-${String(endDt.getDate()).padStart(2, '0')}`;
  return { start, end };
}

export const weeklyPlanRepository = {
  /** Crea (o devuelve) el plan de la semana que contiene la fecha dada */
  async ensurePlan(weekStartDate?: string): Promise<WeeklyPlan> {
    const db = await getDatabase();
    const { start, end } = mondayOf(weekStartDate ?? new Date().toISOString().slice(0, 10));

    const existing = await db.getFirstAsync<{ id: number; week_start: string; week_end: string; label: string | null }>(
      'SELECT * FROM weekly_plans WHERE week_start = ?', [start],
    );
    if (existing) return { id: existing.id, weekStart: existing.week_start, weekEnd: existing.week_end, label: existing.label };

    const res = await db.runAsync(
      'INSERT INTO weekly_plans (week_start, week_end, label, created_at) VALUES (?, ?, ?, ?)',
      [start, end, `Semana del ${start.slice(8)}/${start.slice(5, 7)}`, new Date().toISOString()],
    );
    return { id: Number(res.lastInsertRowId), weekStart: start, weekEnd: end, label: `Semana del ${start.slice(8)}/${start.slice(5, 7)}` };
  },

  /** Lista todos los planes ordenados por semana descendente */
  async listPlans(): Promise<WeeklyPlan[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; week_start: string; week_end: string; label: string | null }>(
      'SELECT * FROM weekly_plans ORDER BY week_start DESC',
    );
    return rows.map(r => ({ id: r.id, weekStart: r.week_start, weekEnd: r.week_end, label: r.label }));
  },

  /** Plan de una semana concreta (null si no existe) */
  async getPlanByWeekStart(start: string): Promise<WeeklyPlan | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<{ id: number; week_start: string; week_end: string; label: string | null }>(
      'SELECT * FROM weekly_plans WHERE week_start = ?', [start],
    );
    return r ? { id: r.id, weekStart: r.week_start, weekEnd: r.week_end, label: r.label } : null;
  },

  /** Items (rutinas asignadas) de un plan, con nombre de rutina */
  async getItems(planId: number): Promise<WeeklyPlanItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; plan_id: number; routine_id: number; routine_name: string; day_of_week: number; notes: string | null }>(
      `SELECT wpi.*, r.name AS routine_name
       FROM weekly_plan_items wpi JOIN routines r ON r.id = wpi.routine_id
       WHERE wpi.plan_id = ? ORDER BY wpi.day_of_week, wpi.id`,
      [planId],
    );
    return rows.map(r => ({ id: r.id, planId: r.plan_id, routineId: r.routine_id, routineName: r.routine_name, dayOfWeek: r.day_of_week, notes: r.notes }));
  },

  /** Asigna una rutina a un día del plan */
  async addItem(planId: number, routineId: number, dayOfWeek: number, notes?: string): Promise<void> {
    if (dayOfWeek < 1 || dayOfWeek > 7) throw new AppError('VALIDATION', 'Día inválido (1=lun..7=dom)');
    const db = await getDatabase();
    // Evitar duplicado exacto (misma rutina el mismo día)
    const dup = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM weekly_plan_items WHERE plan_id = ? AND routine_id = ? AND day_of_week = ?',
      [planId, routineId, dayOfWeek],
    );
    if (dup) throw new AppError('CONFLICT', 'Esa rutina ya está asignada a ese día');
    await db.runAsync(
      'INSERT INTO weekly_plan_items (plan_id, routine_id, day_of_week, notes, created_at) VALUES (?, ?, ?, ?, ?)',
      [planId, routineId, dayOfWeek, notes ?? null, new Date().toISOString()],
    );
  },

  async removeItem(itemId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM weekly_plan_items WHERE id = ?', [itemId]);
  },

  async deletePlan(planId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM weekly_plans WHERE id = ?', [planId]);
  },

  /**
   * Progreso real de la semana: cruza el plan con sesiones finalizadas.
   * Considera "completado" un día planificado si hay sesión finalizada ese día.
   */
  async getWeekProgress(plan: WeeklyPlan, items: WeeklyPlanItem[]): Promise<WeekProgress> {
    const db = await getDatabase();
    const sessions = await db.getAllAsync<{ session_date: string; sets: number; volume: number }>(
      `SELECT ws.session_date,
              COUNT(ss.id) AS sets,
              SUM(COALESCE(ss.weight, 0) * COALESCE(ss.reps, 0)) AS volume
       FROM workout_sessions ws
       LEFT JOIN session_exercises se ON se.session_id = ws.id
       LEFT JOIN session_sets ss ON ss.session_exercise_id = se.id AND ss.is_completed = 1
       WHERE ws.finished_at IS NOT NULL AND ws.session_date BETWEEN ? AND ?
       GROUP BY ws.session_date`,
      [plan.weekStart, plan.weekEnd],
    );

    const completedDates = sessions.map(s => s.session_date);
    const totalSessions = sessions.length;
    const totalSets = sessions.reduce((a, s) => a + s.sets, 0);
    const totalVolume = sessions.reduce((a, s) => a + s.volume, 0);

    // Días planificados ÚNICOS (varias rutinas un mismo día = 1 día planificado)
    const plannedDays = [...new Set(items.map(i => i.dayOfWeek))];
    const plannedDates = plannedDays.map(d => {
      const [y, m, dd] = plan.weekStart.split('-').map(Number) as [number, number, number];
      const dt = new Date(y, m - 1, dd + (d - 1));
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    });
    const completedCount = plannedDates.filter(d => completedDates.includes(d)).length;
    const completedRoutines = await db.getAllAsync<{ name: string }>(
      `SELECT DISTINCT r.name FROM workout_sessions ws
       JOIN routines r ON r.id = ws.routine_id
       WHERE ws.finished_at IS NOT NULL AND ws.session_date BETWEEN ? AND ?`,
      [plan.weekStart, plan.weekEnd],
    );

    return {
      completedDates,
      completedRoutines: completedRoutines.map(r => r.name),
      totalSessions,
      totalSets,
      totalVolume,
      plannedCount: plannedDays.length,
      completedCount,
      completionPct: plannedDays.length > 0 ? Math.round((completedCount / plannedDays.length) * 100) : 0,
    };
  },
};
