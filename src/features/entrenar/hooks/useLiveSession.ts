import { useCallback, useEffect, useState } from 'react';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { toAppError, type AppError } from '@/core/errors';
import { useSessionStore, type LiveExercise } from '@/state/useSessionStore';
import { todayISO } from '@/utils/dates';

/**
 * useLiveSession — BLUEPRINTS §4 · PLAN_DE_SPRINTS §6.4-6.5
 * Orquesta la sesión en vivo: carga (o restaura), completa series con
 * persistencia INMEDIATA (regla 2) y detecta PRs (HU-04).
 */

interface UseLiveSessionResult {
  ready: boolean;
  error: AppError | null;
  /** Completa una serie → persiste YA → actualiza store con isPr */
  completeSet: (exerciseIndex: number, setNumber: number, weight: number, reps: number, rpe: number | null) => Promise<boolean>;
  startNew: (routineId: number) => Promise<void>;
  finish: () => Promise<void>;
  addSet: (exerciseIndex: number) => void;
}

export function useLiveSession(sessionIdParam?: number): UseLiveSessionResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const store = useSessionStore();

  /** Carga desde DB: reconstruye ejercicios + sets completados (restauración tras crash) */
  const load = useCallback(async () => {
    setError(null);
    try {
      let sessionId = sessionIdParam ?? store.sessionId;
      let date = store.sessionDate ?? todayISO();

      if (!sessionId) {
        const active = await workoutRepository.getActiveSession(todayISO());
        if (active) {
          sessionId = active.id;
          date = active.sessionDate;
        }
      }
      if (!sessionId) {
        setReady(true);
        return;
      }

      const seRows = await workoutRepository.getSessionExercises(sessionId);
      const exercises: LiveExercise[] = [];
      for (const se of seRows) {
        const sets = await workoutRepository.getSetsOfSessionExercise(se.id);
        const detail = await workoutRepository.getBestSet(se.exerciseId);
        exercises.push({
          sessionExerciseId: se.id,
          exerciseId: se.exerciseId,
          name: `Ejercicio #${se.exerciseId}`,
          orderIndex: se.orderIndex,
          targetSets: sets.length || 3,
          targetReps: null,
          restSeconds: null,
          historyLine: detail ? `${detail.weight}kg × ${detail.reps}` : null,
          sets: sets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            rpe: s.rpe,
            isCompleted: s.isCompleted,
            isPr: s.isPr,
          })),
        });
      }
      store.startSession(sessionId, date, exercises);
      setReady(true);
    } catch (e) {
      setError(toAppError(e));
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdParam]);

  useEffect(() => {
    load();
  }, [load]);

  const completeSet = useCallback<UseLiveSessionResult['completeSet']>(
    async (exerciseIndex, setNumber, weight, reps, rpe) => {
      const ex = store.exercises[exerciseIndex];
      if (!ex) return false;
      try {
        const { isPr } = await workoutRepository.completeSet(ex.sessionExerciseId, {
          setNumber,
          weight,
          reps,
          rpe,
        });
        store.markSetCompleted(exerciseIndex, setNumber, isPr);
        return isPr;
      } catch (e) {
        setError(toAppError(e));
        return false;
      }
    },
    [store],
  );

  const startNew = useCallback(
    async (routineId: number) => {
      setError(null);
      try {
        const session = await workoutRepository.startSession(routineId, todayISO());
        store.reset();
        store.startSession(session.id, session.sessionDate, []);
        await load();
      } catch (e) {
        setError(toAppError(e));
        throw e;
      }
    },
    [store, load],
  );

  const finish = useCallback(async () => {
    if (store.sessionId) {
      await workoutRepository.finishSession(store.sessionId);
      store.reset();
    }
  }, [store]);

  const addSet = useCallback(
    (exerciseIndex: number) => {
      store.addSet(exerciseIndex);
    },
    [store],
  );

  return { ready, error, completeSet, startNew, finish, addSet };
}
