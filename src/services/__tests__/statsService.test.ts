import { statsService } from '../statsService';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache } from '@/core/db/database';

/**
 * Tests de statsService — racha de sesiones (semanas lun→dom con ≥1 sesión
 * terminada, con gracia de "semana actual vacía"). Esquema REAL sobre
 * better-sqlite3 en memoria (mismo harness que bodyMeasurementService).
 */

beforeEach(async () => {
  _resetDatabaseCache();
  _resetTestDatabase();
  await openDatabaseAsync();
});

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lunes de la semana anterior en `n` semanas (0 = semana actual) */
function mondayWeeksAgo(n: number): string {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - 7 * n);
  return isoOf(monday);
}

async function insertSession(sessionDate: string, finished: boolean): Promise<void> {
  const db = await openDatabaseAsync();
  await db.runAsync(
    'INSERT INTO workout_sessions (session_date, started_at, finished_at, created_at) VALUES (?, ?, ?, ?)',
    [sessionDate, `${sessionDate}T09:00:00.000Z`, finished ? `${sessionDate}T10:00:00.000Z` : null, sessionDate],
  );
}

describe('statsService.sessionWeekStreak', () => {
  test('sin sesiones ⇒ 0', async () => {
    expect(await statsService.sessionWeekStreak()).toBe(0);
  });

  test('sesión en la semana actual ⇒ racha 1', async () => {
    await insertSession(mondayWeeksAgo(0), true);
    expect(await statsService.sessionWeekStreak()).toBe(1);
  });

  test('semana actual + anterior ⇒ racha 2 (días en orden inverso)', async () => {
    await insertSession(mondayWeeksAgo(1), true);
    await insertSession(mondayWeeksAgo(0), true);
    expect(await statsService.sessionWeekStreak()).toBe(2);
  });

  test('gracia: solo la semana pasada (actual vacía) ⇒ racha 1', async () => {
    await insertSession(mondayWeeksAgo(1), true);
    expect(await statsService.sessionWeekStreak()).toBe(1);
  });

  test('hueco: sesión hace 3 semanas sin recientes ⇒ 0', async () => {
    await insertSession(mondayWeeksAgo(3), true);
    expect(await statsService.sessionWeekStreak()).toBe(0);
  });

  test('sesiones sin terminar (finished_at NULL) no cuentan', async () => {
    await insertSession(mondayWeeksAgo(0), false);
    await insertSession(mondayWeeksAgo(1), false);
    expect(await statsService.sessionWeekStreak()).toBe(0);
  });
});
