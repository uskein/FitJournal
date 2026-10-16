import { create } from 'zustand';
import type { SessionExercise } from '@/core/types';

/**
 * useSessionStore — ADR-006 · PLAN_DE_SPRINTS §6.4-6.5
 * Estado EN VIVO de la sesión de gym (respuesta inmediata al toque).
 * La persistencia a SQLite es INDEPENDIENTE (workoutRepository.completeSet)
 * → un crash no pierde nada; este store solo es UI.
 */

export interface LiveSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number | null;
  isCompleted: boolean;
  isPr: boolean;
}

export interface LiveExercise {
  sessionExerciseId: number;
  exerciseId: number;
  name: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
  restSeconds: number | null;
  /** "Última vez: 80kg×5,5,5" (HU-03) */
  historyLine: string | null;
  sets: LiveSet[];
}

interface SessionState {
  sessionId: number | null;
  sessionDate: string | null;
  exercises: LiveExercise[];
  currentIndex: number;

  startSession: (sessionId: number, date: string, exercises: LiveExercise[]) => void;
  markSetCompleted: (exerciseIndex: number, setNumber: number, isPr: boolean) => void;
  setCurrentIndex: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  sessionDate: null,
  exercises: [],
  currentIndex: 0,

  startSession: (sessionId, date, exercises) =>
    set({ sessionId, sessionDate: date, exercises, currentIndex: 0 }),

  markSetCompleted: (exerciseIndex, setNumber, isPr) =>
    set((state) => {
      const exercises = state.exercises.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.setNumber === setNumber ? { ...s, isCompleted: true, isPr } : s,
              ),
            },
      );
      return { exercises };
    }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  addSet: (exerciseIndex) =>
    set((state) => {
      const exercises = state.exercises.map((ex, i) =>
        i !== exerciseIndex
          ? ex
          : {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  setNumber: ex.sets.length + 1,
                  weight: ex.sets[ex.sets.length - 1]?.weight ?? 20,
                  reps: ex.sets[ex.sets.length - 1]?.reps ?? 10,
                  rpe: null,
                  isCompleted: false,
                  isPr: false,
                },
              ],
            },
      );
      return { exercises };
    }),

  reset: () => set({ sessionId: null, sessionDate: null, exercises: [], currentIndex: 0 }),
}));
