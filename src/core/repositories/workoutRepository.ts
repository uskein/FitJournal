import { getDatabase } from '@/core/db/database';
import { AppError, toAppError } from '@/core/errors';
import type {
  Exercise,
  Routine,
  RoutineExercise,
  SessionExercise,
  SessionSet,
  WorkoutSession,
} from '@/core/types';
import {
  exerciseInputSchema,
  routineInputSchema,
  sessionDateSchema,
  setInputSchema,
  type SetInputParsed,
} from '@/core/validation/workoutSchemas';
import { isoDay } from '@/core/validation/diarySchemas';

/**
 * workoutRepository — fuente: CONTRATOS_API.md §3
 * Reglas inquebrantables:
 *  - completeSet() persiste INCREMENTALMENTE (resiste crash) — REQUERIMIENTOS regla 2
 *  - PR = max(weight × reps) histórico del mismo ejercicio — regla 6
 *  - 1 sesión activa a la vez (CONFLICT)
 */

interface SessionRow {
  id: number;
  routine_id: number | null;
  session_date: string;
  started_at: string | null;
  finished_at: string | null;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
}

function toSession(r: SessionRow): WorkoutSession {
  return {
    id: r.id,
    routineId: r.routine_id,
    sessionDate: r.session_date,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    durationMin: r.duration_min,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

export const workoutRepository = {
  // ── Rutinas ──────────────────────────────────────────
  async listRoutines(): Promise<Routine[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      description: string | null;
      is_archived: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM routines WHERE is_archived = 0 ORDER BY updated_at DESC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isArchived: !!r.is_archived,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async createRoutine(input: unknown): Promise<Routine> {
    const parsed = routineInputSchema.parse(input);
    const db = await getDatabase();
    const now = new Date().toISOString();

    let createdId = 0;
    await db.withTransactionAsync(async () => {
      const res = await db.runAsync(
        'INSERT INTO routines (name, description, is_archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
        [parsed.name, parsed.description ?? null, now, now],
      );
      createdId = Number(res.lastInsertRowId);

      for (const re of parsed.exercises) {
        await db.runAsync(
          `INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [createdId, re.exerciseId, re.orderIndex, re.targetSets ?? null, re.targetReps ?? null, re.targetWeight ?? null, re.restSeconds ?? null, re.notes ?? null],
        );
      }
    });

    return {
      id: createdId,
      name: parsed.name,
      description: parsed.description ?? null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getRoutineExercises(routineId: number): Promise<RoutineExercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      routine_id: number;
      exercise_id: number;
      order_index: number;
      target_sets: number | null;
      target_reps: number | null;
      target_weight: number | null;
      rest_seconds: number | null;
      notes: string | null;
    }>('SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY order_index', [routineId]);
    return rows.map((r) => ({
      id: r.id,
      routineId: r.routine_id,
      exerciseId: r.exercise_id,
      orderIndex: r.order_index,
      targetSets: r.target_sets,
      targetReps: r.target_reps,
      targetWeight: r.target_weight,
      restSeconds: r.rest_seconds,
      notes: r.notes,
    }));
  },

  // ── Ejercicios ───────────────────────────────────────
  async listExercises(): Promise<Exercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      muscle_primary: string;
      muscle_secondary: string | null;
      equipment: string | null;
      type: string | null;
      instructions: string | null;
      is_custom: number;
      is_archived: number;
    }>('SELECT * FROM exercises WHERE is_archived = 0 ORDER BY muscle_primary, name');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      musclePrimary: r.muscle_primary,
      muscleSecondary: r.muscle_secondary,
      equipment: r.equipment,
      type: r.type,
      instructions: r.instructions,
      isCustom: !!r.is_custom,
      isArchived: !!r.is_archived,
    }));
  },

  async searchExercises(query: string): Promise<Exercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      name: string;
      muscle_primary: string;
      muscle_secondary: string | null;
      equipment: string | null;
      type: string | null;
      instructions: string | null;
      is_custom: number;
      is_archived: number;
    }>(
      `SELECT e.* FROM exercises_fts fts JOIN exercises e ON e.id = fts.rowid
       WHERE exercises_fts MATCH ? AND e.is_archived = 0 ORDER BY rank`,
      [query],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      musclePrimary: r.muscle_primary,
      muscleSecondary: r.muscle_secondary,
      equipment: r.equipment,
      type: r.type,
      instructions: r.instructions,
      isCustom: !!r.is_custom,
      isArchived: !!r.is_archived,
    }));
  },

  async createCustomExercise(input: unknown): Promise<Exercise> {
    const parsed = exerciseInputSchema.parse(input);
    const db = await getDatabase();
    const res = await db.runAsync(
      `INSERT INTO exercises (name, muscle_primary, muscle_secondary, equipment, type, instructions, is_custom)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [parsed.name, parsed.musclePrimary, parsed.muscleSecondary ?? null, parsed.equipment ?? null, parsed.type ?? null, parsed.instructions ?? null],
    );
    return {
      id: Number(res.lastInsertRowId),
      name: parsed.name,
      musclePrimary: parsed.musclePrimary,
      muscleSecondary: parsed.muscleSecondary ?? null,
      equipment: parsed.equipment ?? null,
      type: parsed.type ?? null,
      instructions: parsed.instructions ?? null,
      isCustom: true,
      isArchived: false,
    };
  },

  // ── Sesiones ─────────────────────────────────────────
  /** Regla: 1 sesión activa a la vez */
  async startSession(routineId: number, date: string): Promise<WorkoutSession> {
    sessionDateSchema.parse(date);
    const db = await getDatabase();

    const active = await db.getFirstAsync<SessionRow>(
      'SELECT * FROM workout_sessions WHERE session_date = ? AND finished_at IS NULL',
      [date],
    );
    if (active) {
      throw new AppError('CONFLICT', 'Ya hay una sesión activa hoy; continúala o finalízala primero');
    }

    const routineExercises = await this.getRoutineExercises(routineId);
    if (routineExercises.length === 0) {
      throw new AppError('VALIDATION', 'La rutina está vacía; añade ejercicios antes de entrenar');
    }

    const now = new Date().toISOString();
    let sessionId = 0;

    await db.withTransactionAsync(async () => {
      const res = await db.runAsync(
        'INSERT INTO workout_sessions (routine_id, session_date, started_at, created_at) VALUES (?, ?, ?, ?)',
        [routineId, date, now, now],
      );
      sessionId = Number(res.lastInsertRowId);

      for (const re of routineExercises) {
        await db.runAsync(
          'INSERT INTO session_exercises (session_id, exercise_id, order_index) VALUES (?, ?, ?)',
          [sessionId, re.exerciseId, re.orderIndex],
        );
      }
    });

    return {
      id: sessionId,
      routineId,
      sessionDate: date,
      startedAt: now,
      finishedAt: null,
      durationMin: null,
      notes: null,
      createdAt: now,
    };
  },

  /**
   * Persiste la serie INMEDIATAMENTE (regla 2) y detecta PR (regla 6).
   * PR = weight × reps máximo histórico del ejercicio.
   */
  async completeSet(
    sessionExerciseId: number,
    input: SetInputParsed,
  ): Promise<{ isPr: boolean; set: SessionSet }> {
    const parsed = setInputSchema.parse(input);
    const db = await getDatabase();

    const seRow = await db.getFirstAsync<{ exercise_id: number }>(
      'SELECT exercise_id FROM session_exercises WHERE id = ?',
      [sessionExerciseId],
    );
    if (!seRow) throw new AppError('NOT_FOUND', 'Ejercicio de sesión inexistente');

    // Histórico del ejercicio (excluyendo la serie actual)
    const best = await db.getFirstAsync<{ best: number | null }>(
      `SELECT MAX(ss.weight * ss.reps) AS best
       FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id
       WHERE se.exercise_id = ? AND ss.is_completed = 1`,
      [seRow.exercise_id],
    );

    const currentScore = (parsed.weight ?? 0) * (parsed.reps ?? 0);
    const isPr = currentScore > 0 && currentScore > (best?.best ?? 0);

    const res = await db.runAsync(
      `INSERT INTO session_sets (session_exercise_id, set_number, weight, reps, rpe, is_completed, is_pr)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [sessionExerciseId, parsed.setNumber, parsed.weight ?? null, parsed.reps ?? null, parsed.rpe ?? null, isPr ? 1 : 0],
    );

    const set: SessionSet = {
      id: Number(res.lastInsertRowId),
      sessionExerciseId,
      setNumber: parsed.setNumber,
      weight: parsed.weight ?? null,
      reps: parsed.reps ?? null,
      rpe: parsed.rpe ?? null,
      isCompleted: true,
      isPr,
    };
    return { isPr, set };
  },

  /** Historial "última vez" del ejercicio (HU-03) */
  async getSessionHistory(exerciseId: number, limit = 1): Promise<SessionExercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      session_id: number;
      exercise_id: number;
      order_index: number;
      notes: string | null;
    }>(
      `SELECT se.* FROM session_exercises se
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE se.exercise_id = ? AND ws.finished_at IS NOT NULL
       ORDER BY ws.session_date DESC LIMIT ?`,
      [exerciseId, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      exerciseId: r.exercise_id,
      orderIndex: r.order_index,
      notes: r.notes,
    }));
  },

  /** Series de un ejercicio de sesión (para reconstruir estado en vivo) */
  async getSetsOfSessionExercise(sessionExerciseId: number): Promise<SessionSet[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      session_exercise_id: number;
      set_number: number;
      weight: number | null;
      reps: number | null;
      rpe: number | null;
      is_completed: number;
      is_pr: number;
    }>('SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_number', [sessionExerciseId]);
    return rows.map((r) => ({
      id: r.id,
      sessionExerciseId: r.session_exercise_id,
      setNumber: r.set_number,
      weight: r.weight,
      reps: r.reps,
      rpe: r.rpe,
      isCompleted: !!r.is_completed,
      isPr: !!r.is_pr,
    }));
  },

  async getSessionExercises(sessionId: number): Promise<SessionExercise[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      session_id: number;
      exercise_id: number;
      order_index: number;
      notes: string | null;
    }>('SELECT * FROM session_exercises WHERE session_id = ? ORDER BY order_index', [sessionId]);
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      exerciseId: r.exercise_id,
      orderIndex: r.order_index,
      notes: r.notes,
    }));
  },

  async finishSession(sessionId: number): Promise<WorkoutSession> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [sessionId]);
    if (!row) throw new AppError('NOT_FOUND', 'Sesión inexistente');
    if (row.finished_at) throw new AppError('CONFLICT', 'La sesión ya fue finalizada');

    const finishedAt = new Date().toISOString();
    const started = row.started_at ? new Date(row.started_at).getTime() : Date.now();
    const durationMin = Math.max(1, Math.round((Date.now() - started) / 60000));

    await db.runAsync(
      'UPDATE workout_sessions SET finished_at = ?, duration_min = ? WHERE id = ?',
      [finishedAt, durationMin, sessionId],
    );

    return { ...toSession(row), finishedAt, durationMin };
  },

  async getActiveSession(date: string): Promise<WorkoutSession | null> {
    sessionDateSchema.parse(date);
    const db = await getDatabase();
    const row = await db.getFirstAsync<SessionRow>(
      'SELECT * FROM workout_sessions WHERE session_date = ? AND finished_at IS NULL',
      [date],
    );
    return row ? toSession(row) : null;
  },

  /** Mejor marca histórica de un ejercicio (para mostrar "PR actual") */
  async getBestSet(exerciseId: number): Promise<{ weight: number; reps: number } | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ weight: number | null; reps: number | null }>(
      `SELECT ss.weight, ss.reps FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       WHERE se.exercise_id = ? AND ss.is_completed = 1
       ORDER BY (ss.weight * ss.reps) DESC LIMIT 1`,
      [exerciseId],
    );
    if (!row?.weight || !row?.reps) return null;
    return { weight: row.weight, reps: row.reps };
  },
};
