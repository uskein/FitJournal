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

describe('workoutRepository — seed v2 enriquecido + edición + récords', () => {
  beforeEach(async () => {
    _resetDatabaseCache();
    _resetTestDatabase();
    const db = await openDatabaseAsync();
    const ex = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises LIMIT 1');
    exerciseId = ex!.id;
    const routine = await workoutRepository.createRoutine({
      name: 'Rutina Edición',
      exercises: [{ exerciseId, orderIndex: 0, targetSets: 3, targetReps: 5 }],
    });
    routineId = routine.id;
  });

  test('seed v2: los 39 ejercicios precargados tienen zonas, niveles y beneficios', async () => {
    const all = await workoutRepository.listExercises();
    expect(all.length).toBe(39);

    // Todos deben venir enriquecidos (zonas + niveles + beneficios + vídeo)
    const missing = all.filter(e => !e.muscleZones || !e.skillLevel || !e.effortLevel || !e.healthBenefits || !e.videoUrl);
    expect(missing.map(e => e.name)).toEqual([]);
  });

  test('updateExercise permite editar un ejercicio PRECARGADO (no solo custom)', async () => {
    const preloaded = await workoutRepository.getExerciseById(exerciseId);
    expect(preloaded?.isCustom).toBe(false);

    const updated = await workoutRepository.updateExercise(exerciseId, {
      name: preloaded!.name,
      musclePrimary: preloaded!.musclePrimary,
      muscleSecondary: 'core',
      equipment: 'kettlebell',
      type: 'compuesto',
      instructions: 'Instrucciones mejoradas por el usuario.',
      videoUrl: 'https://www.youtube.com/results?search_query=prueba',
      imagePath: 'file:///nueva-imagen.jpg',
      skillLevel: 2,
      effortLevel: 4,
      muscleZones: 'pierna,core',
      healthBenefits: 'Beneficio de prueba\nSegundo beneficio',
    });

    expect(updated.equipment).toBe('kettlebell');
    expect(updated.skillLevel).toBe(2);
    expect(updated.effortLevel).toBe(4);
    expect(updated.muscleZones).toBe('pierna,core');
    expect(updated.imagePath).toBe('file:///nueva-imagen.jpg');
    expect(updated.instructions).toContain('mejoradas');

    // Verificar persistencia
    const again = await workoutRepository.getExerciseById(exerciseId);
    expect(again?.muscleZones).toBe('pierna,core');
  });

  test('updateExercise lanza NOT_FOUND para id inexistente', async () => {
    await expect(workoutRepository.updateExercise(999999, { name: 'X', musclePrimary: 'core' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('getPersonalRecords devuelve la mejor marca por ejercicio ordenada por volumen', async () => {
    const s = await workoutRepository.startSession(routineId, '2026-10-20');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;
    await workoutRepository.completeSet(se.id, { setNumber: 1, weight: 100, reps: 5 }); // vol 500
    await workoutRepository.completeSet(se.id, { setNumber: 2, weight: 80, reps: 8 });  // vol 640 (mejor)
    await workoutRepository.finishSession(s.id);

    const prs = await workoutRepository.getPersonalRecords();
    const mine = prs.find(p => p.exerciseId === exerciseId);
    expect(mine).toBeDefined();
    expect(mine!.weight).toBe(80);
    expect(mine!.reps).toBe(8);
    expect(mine!.volume).toBe(640);
    expect(mine!.date).toBe('2026-10-20');
  });

  test('getWeeklyZoneVolume reparte el volumen por zonas de la semana', async () => {
    // Asegurar zonas en el ejercicio precargado
    const ex = await workoutRepository.getExerciseById(exerciseId);
    await workoutRepository.updateExercise(exerciseId, {
      name: ex!.name, musclePrimary: ex!.musclePrimary,
      muscleZones: 'pierna,core',
    });

    const s = await workoutRepository.startSession(routineId, '2026-10-21');
    const se = (await workoutRepository.getSessionExercises(s.id))[0]!;
    await workoutRepository.completeSet(se.id, { setNumber: 1, weight: 100, reps: 10 }); // vol 1000 → 500 por zona
    await workoutRepository.finishSession(s.id);

    const zones = await workoutRepository.getWeeklyZoneVolume('2026-10-19', '2026-10-25');
    const pierna = zones.find(z => z.zone === 'pierna');
    const core = zones.find(z => z.zone === 'core');
    expect(pierna?.volume).toBe(500);
    expect(core?.volume).toBe(500);
  });
});
