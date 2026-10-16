/**
 * Entidades del dominio — fuente: MODELO_DE_DATOS.md §6 · CONTRATOS_API.md §1.1
 * Todas las fechas en ISO: días = 'YYYY-MM-DD', timestamps = ISO 8601 completo.
 */

export interface DiaryEntry {
  id: number;
  entryDate: string;
  mood: 1 | 2 | 3 | 4 | 5 | null;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  sleepHours: number | null;
  bodyWeight: number | null;
  weather: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DiaryEntryInput = Partial<Omit<DiaryEntry, 'id' | 'entryDate' | 'createdAt' | 'updatedAt'>>;

export interface MoodEntry {
  id: number;
  entryId: number;
  emotion: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  context: string | null;
}

export type MoodInput = Pick<MoodEntry, 'emotion' | 'intensity'> & { context?: string | null };

export interface GratitudeItem {
  id: number;
  entryId: number;
  text: string;
  createdAt: string;
}

export type WellnessMetricName = 'water' | 'meditation' | 'steps' | 'reading';

export interface WellnessMetric {
  id: number;
  entryId: number;
  metric: WellnessMetricName;
  value: number | null;
  unit: string | null;
}

export interface Habit {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: number;
  habitId: number;
  logDate: string;
  done: boolean;
}

export interface Goal {
  id: number;
  title: string;
  targetDate: string | null;
  progress: number;
  status: 'active' | 'done' | 'archived';
  createdAt: string;
}

export interface Exercise {
  id: number;
  name: string;
  musclePrimary: string;
  muscleSecondary: string | null;
  equipment: string | null;
  type: string | null;
  instructions: string | null;
  isCustom: boolean;
  isArchived: boolean;
  /** Nuevos campos (migración 002) */
  imagePath: string | null;
  videoPath: string | null;
  videoUrl: string | null;
  skillLevel: 1 | 2 | 3 | 4 | 5 | null;
  effortLevel: 1 | 2 | 3 | 4 | 5 | null;
  muscleZones: string | null;
  healthBenefits: string | null;
}

export interface Routine {
  id: number;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineExercise {
  id: number;
  routineId: number;
  exerciseId: number;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: number;
  routineId: number | null;
  sessionDate: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMin: number | null;
  notes: string | null;
  createdAt: string;
}

export interface SessionExercise {
  id: number;
  sessionId: number;
  exerciseId: number;
  orderIndex: number;
  notes: string | null;
}

export interface SessionSet {
  id: number;
  sessionExerciseId: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isCompleted: boolean;
  isPr: boolean;
}

export interface Photo {
  id: number;
  ownerType: 'diary' | 'session';
  ownerId: number;
  filePath: string;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

/** Resumen de sesión para listas/historial */
export interface SessionSummary {
  id: number;
  sessionDate: string;
  durationMin: number | null;
  routineName: string | null;
  setCount: number;
}
