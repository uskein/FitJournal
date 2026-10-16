import { useCallback, useEffect, useState } from 'react';
import { getDatabase } from '@/core/db/database';
import { toAppError, type AppError } from '@/core/errors';

/**
 * useMonthEntries — BLUEPRINTS §2 (Diario/calendario)
 * Devuelve un mapa fecha → { hasEntry, color, hasWorkout } para pintar el
 * calendario: mood color del día + puntito terracota si hubo gym.
 */

export interface DayMarker {
  hasEntry: boolean;
  color: string | null;
  hasWorkout: boolean;
}

export type MonthMarkers = Record<string, DayMarker>;

interface UseMonthResult {
  markers: MonthMarkers;
  loading: boolean;
  error: AppError | null;
  refresh: () => Promise<void>;
}

function monthRange(year: number, month: number): [string, string] {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return [from, to];
}

export function useMonthEntries(year: number, month: number): UseMonthResult {
  const [markers, setMarkers] = useState<MonthMarkers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await getDatabase();
      const [from, to] = monthRange(year, month);

      const entries = await db.getAllAsync<{ entry_date: string }>(
        'SELECT entry_date FROM diary_entries WHERE entry_date BETWEEN ? AND ?',
        [from, to],
      );
      const colors = await db.getAllAsync<{ entry_date: string; color: string }>(
        `SELECT de.entry_date, dc.color FROM day_colors dc
         JOIN diary_entries de ON de.id = dc.entry_id
         WHERE de.entry_date BETWEEN ? AND ?`,
        [from, to],
      );
      const workouts = await db.getAllAsync<{ session_date: string }>(
        'SELECT DISTINCT session_date FROM workout_sessions WHERE session_date BETWEEN ? AND ?',
        [from, to],
      );

      const map: MonthMarkers = {};
      for (const e of entries) {
        map[e.entry_date] = { hasEntry: true, color: null, hasWorkout: false };
      }
      for (const c of colors) {
        const m = map[c.entry_date];
        if (m) m.color = c.color;
      }
      for (const w of workouts) {
        const m = map[w.session_date];
        if (m) m.hasWorkout = true;
        else map[w.session_date] = { hasEntry: false, color: null, hasWorkout: true };
      }
      setMarkers(map);
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { markers, loading, error, refresh };
}
