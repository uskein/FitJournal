import { getDatabase } from '@/core/db/database';

/**
 * weeklySummaryService — resumen automático de la semana.
 * Cada domingo genera: gym, diario, hábitos, sueño promedio, ánimo promedio.
 */

export interface WeeklySummary {
  gymSessions: number;
  diaryEntries: number;
  habitsDone: number;
  avgSleep: number | null;
  avgMood: number | null;
  totalSets: number;
  bestLift: string | null;
  streakDays: number;
}

export const weeklySummaryService = {
  async getSummary(weekStart: string, weekEnd: string): Promise<WeeklySummary> {
    const db = await getDatabase();

    const gym = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM workout_sessions WHERE session_date BETWEEN ? AND ? AND finished_at IS NOT NULL',
      [weekStart, weekEnd],
    );
    const diary = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date BETWEEN ? AND ?',
      [weekStart, weekEnd],
    );
    const habits = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM habit_logs WHERE log_date BETWEEN ? AND ? AND done = 1',
      [weekStart, weekEnd],
    );
    const sleep = await db.getFirstAsync<{ avg: number | null }>(
      'SELECT AVG(sleep_hours) AS avg FROM diary_entries WHERE entry_date BETWEEN ? AND ? AND sleep_hours IS NOT NULL',
      [weekStart, weekEnd],
    );
    const mood = await db.getFirstAsync<{ avg: number | null }>(
      'SELECT AVG(mood) AS avg FROM diary_entries WHERE entry_date BETWEEN ? AND ? AND mood IS NOT NULL',
      [weekStart, weekEnd],
    );
    const sets = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE ws.session_date BETWEEN ? AND ? AND ss.is_completed = 1`,
      [weekStart, weekEnd],
    );

    return {
      gymSessions: gym?.n ?? 0,
      diaryEntries: diary?.n ?? 0,
      habitsDone: habits?.n ?? 0,
      avgSleep: sleep?.avg != null ? Math.round(sleep.avg * 10) / 10 : null,
      avgMood: mood?.avg != null ? Math.round(mood.avg * 10) / 10 : null,
      totalSets: sets?.n ?? 0,
      bestLift: null,
      streakDays: 0,
    };
  },
};
