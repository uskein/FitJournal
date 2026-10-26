import { getDatabase } from '@/core/db/database';
import { toAppError } from '@/core/errors';

/**
 * statsService — PLAN_DE_SPRINTS §7 · HU-08/HU-11
 * Agregaciones SQL para Progreso: peso por ejercicio, volumen semanal,
 * rachas, correlaciones y "Mi año" (mood color map).
 * La app NO hace red: todo se calcula localmente sobre SQLite.
 */

export interface WeightPoint {
  date: string;
  weight: number;
  reps: number;
}

export interface WeeklyVolume {
  week: string;
  sets: number;
}

export interface Correlation {
  title: string;
  insight: string;
  icon: string;
}

export interface YearDay {
  date: string;
  color: string | null;
  hasWorkout: boolean;
}

export const statsService = {
  /** Evolución de peso (mejor serie por fecha) de un ejercicio */
  async weightHistory(exerciseId: number): Promise<WeightPoint[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ session_date: string; weight: number | null; reps: number | null }>(
      `SELECT ws.session_date, ss.weight, ss.reps
       FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE se.exercise_id = ? AND ss.is_completed = 1
       ORDER BY ws.session_date`,
      [exerciseId],
    );
    return rows
      .filter((r) => r.weight != null && r.reps != null)
      .map((r) => ({ date: r.session_date, weight: r.weight!, reps: r.reps! }));
  },

  /** Volumen semanal (nº de series completadas por semana ISO) */
  async weeklyVolume(weeks = 8): Promise<WeeklyVolume[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ week: string; sets: number }>(
      `SELECT strftime('%Y-W%W', ws.session_date) AS week, COUNT(*) AS sets
       FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE ss.is_completed = 1
       GROUP BY week ORDER BY week DESC LIMIT ?`,
      [weeks],
    );
    return rows.reverse();
  },

  /** Total de sesiones terminadas */
  async totalSessions(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM workout_sessions WHERE finished_at IS NOT NULL',
    );
    return row?.n ?? 0;
  },

  /** Mejor marca global (para BigData destacado) */
  async bestLift(): Promise<{ exercise: string; weight: number; reps: number } | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ name: string; weight: number | null; reps: number | null }>(
      `SELECT e.name, ss.weight, ss.reps
       FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN exercises e ON e.id = se.exercise_id
       WHERE ss.is_completed = 1 AND ss.weight IS NOT NULL AND ss.reps IS NOT NULL
       ORDER BY (ss.weight * ss.reps) DESC LIMIT 1`,
    );
    if (!row?.weight || !row?.reps) return null;
    return { exercise: row.name, weight: row.weight, reps: row.reps };
  },

  /**
   * Correlación sueño vs rendimiento (HU-08 · diferencial)
   * Compara RPE medio en días con sueño >7h vs ≤7h.
   */
  async sleepVsEffort(): Promise<Correlation | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ sleep: number; avg_rpe: number }>(
      `SELECT de.sleep_hours AS sleep, AVG(ss.rpe) AS avg_rpe
       FROM diary_entries de
       JOIN workout_sessions ws ON ws.session_date = de.entry_date
       JOIN session_exercises se ON se.session_id = ws.id
       JOIN session_sets ss ON ss.session_exercise_id = se.id
       WHERE de.sleep_hours IS NOT NULL AND ss.rpe IS NOT NULL AND ss.is_completed = 1
       GROUP BY CASE WHEN de.sleep_hours > 7 THEN 'sufficient' ELSE 'short' END`,
    );

    const short = rows.find((r) => r.sleep <= 7);
    const enough = rows.find((r) => r.sleep > 7);
    if (!short || !enough) return null;

    const diff = short.avg_rpe - enough.avg_rpe;
    const rounded = Math.round(Math.abs(diff) * 10) / 10;

    return {
      title: 'Sueño y esfuerzo',
      icon: '😴',
      insight:
        diff > 0
          ? `Los días que dormiste más de 7h, tu RPE promedio bajó ${rounded} puntos.`
          : `Tus datos aún no muestran una correlación clara entre sueño y RPE.`,
    };
  },

  /**
   * Correlación gimnasio vs ánimo (diferencial)
   * Compara el ánimo medio en días con sesión finalizada vs sin sesión.
   */
  async gymVsMood(): Promise<Correlation | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ has_gym: number; avg_mood: number; n: number }>(
      `SELECT CASE WHEN ws.session_date IS NOT NULL THEN 1 ELSE 0 END AS has_gym,
              AVG(de.mood) AS avg_mood, COUNT(*) AS n
       FROM diary_entries de
       LEFT JOIN (SELECT DISTINCT session_date FROM workout_sessions WHERE finished_at IS NOT NULL) ws
         ON ws.session_date = de.entry_date
       WHERE de.mood IS NOT NULL
       GROUP BY has_gym`,
    );
    const gym = rows.find((r) => r.has_gym === 1);
    const rest = rows.find((r) => r.has_gym === 0);
    if (!gym || !rest || gym.n < 3 || rest.n < 3) return null;

    const diff = gym.avg_mood - rest.avg_mood;
    if (Math.abs(diff) < 0.2) return null;
    const rounded = Math.round(Math.abs(diff) * 10) / 10;

    return {
      title: 'Gimnasio y ánimo',
      icon: '🏋️',
      insight:
        diff > 0
          ? `Tu ánimo medio sube ${rounded} puntos los días que entrenas (vs días sin gym). ¡El ejercicio te hace más feliz!`
          : `Tus días sin gimnasio tienen mejor ánimo medio (${rounded} puntos). Quizá descansas más esos días.`,
    };
  },

  /** "Mi año" — mood color map anual (HU-06/08) */
  async yearMap(year: number): Promise<YearDay[]> {
    const db = await getDatabase();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const colors = await db.getAllAsync<{ entry_date: string; color: string }>(
      `SELECT de.entry_date, dc.color FROM day_colors dc
       JOIN diary_entries de ON de.id = dc.entry_id
       WHERE de.entry_date BETWEEN ? AND ?`,
      [from, to],
    );
    const workouts = await db.getAllAsync<{ session_date: string }>(
      'SELECT DISTINCT session_date FROM workout_sessions WHERE session_date BETWEEN ? AND ? AND finished_at IS NOT NULL',
      [from, to],
    );

    const colorMap = new Map(colors.map((c) => [c.entry_date, c.color]));
    const workoutSet = new Set(workouts.map((w) => w.session_date));

    const days: YearDay[] = [];
    const d = new Date(year, 0, 1);
    while (d.getFullYear() === year) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, color: colorMap.get(iso) ?? null, hasWorkout: workoutSet.has(iso) });
      d.setDate(d.getDate() + 1);
    }
    return days;
  },
};
