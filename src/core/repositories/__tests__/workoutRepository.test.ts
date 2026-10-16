import { workoutRepository } from '../workoutRepository';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache } from '@/core/db/database';

/**
 * Tests de workoutRepository — PLAN_DE_SPRINTS.md §2.9
 * Cubre: PR detection (HU-04), CONFLICT de sesión activa (borde B4),
 * persistencia incremental, historial (HU-03), finishSession.
 */

let routineId = 0;
let exerciseId = 0;

beforeEach(async () => {
  _resetDatabaseCache();
  _resetTestDatabase();
  const db = await openDatabaseAsync();
  // Seed ya cargó ejercicios; tomamos uno real
  const ex = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises LIMIT 1');
  exerciseId = ex!.id;
  const routine = await workoutRepository.createRoutine({
    name: 'Full Body Test',
    exercises: [{ exerciseId, orderIndex: 0, targetSets: 3, targetReps: 5 }],
  });
  routineId = routine.id;
});

describe('workoutRepository', () => {
  test('seed cargó la biblioteca de ejercicios + FTS funciona', async () => {
    const all = await workoutRepository.listExercises();
    expect(all.length).toBe(39); // ejercicios de exercises.json (seed v1)

    const found = await workoutRepository.searchExercises('sentadilla');
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  test('startSession crea sesión + session_exercises', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    expect(s.sessionDate).toBe('2026-10-15');
    expect(s.finishedAt).toBeNull();

    const exs = await workoutRepository.getSessionExercises(s.id);
    expect(exs).toHaveLength(1);
    expect(exs[0]?.exerciseId).toBe(exerciseId);
  });

  test('CONFLICT: no permite 2 sesiones activas el mismo día (borde B4)', async () => {
    await workoutRepository.startSession(routineId, '2026-10-15');
    await expect(workoutRepository.startSession(routineId, '2026-10-15')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  test('PR detection: primera serie buena es PR; repetir NO (HU-04)', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;

    // Serie 1: 80×5 = 400 → mejor histórico (vacío) → PR
    const r1 = await workoutRepository.completeSet(se.id, { setNumber: 1, weight: 80, reps: 5 });
    expect(r1.isPr).toBe(true);

    // Serie 2: mismo puntaje → NO es PR
    const r2 = await workoutRepository.completeSet(se.id, { setNumber: 2, weight: 80, reps: 5 });
    expect(r2.isPr).toBe(false);

    // Serie 3: 90×5 = 450 → nuevo PR
    const r3 = await workoutRepository.completeSet(se.id, { setNumber: 3, weight: 90, reps: 5 });
    expect(r3.isPr).toBe(true);
  });

  test('persistencia incremental: las series quedan aunque la sesión no finalice (regla 2)', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;
    await workoutRepository.completeSet(se.id, { setNumber: 1, weight: 60, reps: 8 });

    // "Crash simulado": otra instancia de repo ve las series
    const sets = await workoutRepository.getSetsOfSessionExercise(se.id);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.isCompleted).toBe(true);
  });

  test('finishSession calcula duración y bloquea doble finalización', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    const done = await workoutRepository.finishSession(s.id);
    expect(done.finishedAt).not.toBeNull();
    expect(done.durationMin).toBeGreaterThanOrEqual(1);

    await expect(workoutRepository.finishSession(s.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('getBestSet devuelve la mejor marca del ejercicio', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;
    await workoutRepository.completeSet(se.id, { setNumber: 1, weight: 100, reps: 3 });
    await workoutRepository.completeSet(se.id, { setNumber: 2, weight: 90, reps: 5 });

    const best = await workoutRepository.getBestSet(exerciseId);
    expect(best).toEqual({ weight: 90, reps: 5 }); // 450 > 300
  });

  test('Zod rechaza RPE fuera de 1-10', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-15');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;
    await expect(
      workoutRepository.completeSet(se.id, { setNumber: 1, weight: 80, reps: 5, rpe: 12 }),
    ).rejects.toThrow();
  });
});
