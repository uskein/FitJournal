import { useCallback, useEffect, useState } from 'react';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { habitRepository } from '@/core/repositories/habitRepository';
import { toAppError, type AppError } from '@/core/errors';
import type { DiaryEntry, Habit, WorkoutSession } from '@/core/types';
import { todayISO } from '@/utils/dates';

/**
 * useToday — BLUEPRINTS_DE_PANTALLAS.md §1 (Hoy)
 * Agrega el día completo: entrada del diario + sesión activa + hábitos con racha.
 * Implementa los 4 estados: loading | empty (se deriva de los datos) | success | error.
 */

export interface HabitWithState {
  habit: Habit;
  doneToday: boolean;
  streak: number;
}

export interface TodayData {
  date: string;
  entry: DiaryEntry | null;
  session: WorkoutSession | null;
  habits: HabitWithState[];
}

interface UseTodayResult {
  data: TodayData | null;
  loading: boolean;
  error: AppError | null;
  refresh: () => Promise<void>;
}

export function useToday(): UseTodayResult {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const date = todayISO();
      const [entry, session, habits] = await Promise.all([
        diaryRepository.getEntryByDate(date),
        workoutRepository.getActiveSession(date),
        habitRepository.listActiveHabits(),
      ]);

      const habitsWithState: HabitWithState[] = await Promise.all(
        habits.map(async (habit) => ({
          habit,
          doneToday: await habitRepository.isDoneToday(habit.id, date),
          streak: await habitRepository.getStreak(habit.id),
        })),
      );

      setData({ date, entry, session, habits: habitsWithState });
    } catch (e) {
      setError(toAppError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
