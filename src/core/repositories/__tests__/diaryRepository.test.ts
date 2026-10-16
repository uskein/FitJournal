import { diaryRepository } from '../diaryRepository';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache } from '@/core/db/database';
import { AppError } from '@/core/errors';

/**
 * Tests de diaryRepository — PLAN_DE_SPRINTS.md §2.9
 * Esquema REAL (001_init) sobre better-sqlite3 en memoria.
 */

beforeEach(async () => {
  _resetDatabaseCache();
  _resetTestDatabase();
  await openDatabaseAsync();
});

describe('diaryRepository', () => {
  test('upsertEntry crea una entrada por día y la reutiliza (UNIQUE)', async () => {
    const e1 = await diaryRepository.upsertEntry({ mood: 4, notes: 'Buen día' }, '2026-10-15');
    expect(e1.id).toBeGreaterThan(0);
    expect(e1.mood).toBe(4);

    const e2 = await diaryRepository.upsertEntry({ energy: 3 }, '2026-10-15');
    expect(e2.id).toBe(e1.id); // misma fila (UPSERT)
    expect(e2.mood).toBe(4); // conserva mood (COALESCE)
    expect(e2.energy).toBe(3);
  });

  test('getEntryByDate devuelve null si no existe', async () => {
    const e = await diaryRepository.getEntryByDate('2020-01-01');
    expect(e).toBeNull();
  });

  test('Zod rechaza sueño fuera de rango (CA4 de HU-01)', async () => {
    await expect(diaryRepository.upsertEntry({ sleepHours: 30 }, '2026-10-15')).rejects.toThrow();
  });

  test('Zod rechaza fecha inválida', async () => {
    await expect(diaryRepository.getEntryByDate('15-10-2026')).rejects.toThrow();
  });

  test('addGratitude guarda y respeta el límite de 500 chars', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.addGratitude(entry.id, 'Por mi salud');
    const items = await diaryRepository.getGratitudes(entry.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe('Por mi salud');

    await expect(diaryRepository.addGratitude(entry.id, 'x'.repeat(501))).rejects.toThrow();
  });

  test('addGratitude bloquea la 6ª gratitud del día (CONFLICT)', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    for (let i = 0; i < 5; i++) {
      await diaryRepository.addGratitude(entry.id, `Gratitud ${i}`);
    }
    await expect(diaryRepository.addGratitude(entry.id, 'La sexta')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  test('setDayColor solo acepta la paleta cerrada', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.setDayColor(entry.id, '#4E8C6A'); // válida (moodColors)
    await expect(diaryRepository.setDayColor(entry.id, '#123456')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  test('searchDiary encuentra por notas vía FTS5', async () => {
    await diaryRepository.upsertEntry({ notes: 'Hoy sentí mucha alegría' }, '2026-10-14');
    await diaryRepository.upsertEntry({ notes: 'Día difícil de trabajo' }, '2026-10-15');

    const results = await diaryRepository.searchDiary('alegría');
    expect(results).toHaveLength(1);
    expect(results[0]?.entryDate).toBe('2026-10-14');
  });

  test('listEntriesByRange devuelve ordenado DESC', async () => {
    await diaryRepository.upsertEntry({ notes: 'a' }, '2026-10-01');
    await diaryRepository.upsertEntry({ notes: 'b' }, '2026-10-15');
    const list = await diaryRepository.listEntriesByRange('2026-10-01', '2026-10-31');
    expect(list.map((e) => e.entryDate)).toEqual(['2026-10-15', '2026-10-01']);
  });

  test('addWellnessMetric persiste métricas', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.addWellnessMetric(entry.id, { metric: 'water', value: 8, unit: 'vasos' });
    const metrics = await diaryRepository.getWellnessMetrics(entry.id);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.metric).toBe('water');
  });
});
