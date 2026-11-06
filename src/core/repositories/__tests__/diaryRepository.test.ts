import { diaryRepository } from '../diaryRepository';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache, getDatabase } from '@/core/db/database';
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

  test('deleteGratitude elimina una gratitud individual', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.addGratitude(entry.id, 'Una');
    await diaryRepository.addGratitude(entry.id, 'Dos');
    const items = await diaryRepository.getGratitudes(entry.id);
    expect(items).toHaveLength(2);

    await diaryRepository.deleteGratitude(items[0]!.id);
    const after = await diaryRepository.getGratitudes(entry.id);
    expect(after).toHaveLength(1);
    expect(after[0]?.text).toBe('Dos');
  });

  test('setWellnessMetric hace upsert sin duplicar (HU-08)', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.setWellnessMetric(entry.id, 'water', 6, 'vasos');
    await diaryRepository.setWellnessMetric(entry.id, 'water', 8, 'vasos');
    const metrics = await diaryRepository.getWellnessMetrics(entry.id);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.value).toBe(8);

    // valor vacío → borra la métrica
    await diaryRepository.setWellnessMetric(entry.id, 'water', null, null);
    expect(await diaryRepository.getWellnessMetrics(entry.id)).toHaveLength(0);
  });

  test('palabra del día: setWordOfDay + getWordOfDay', async () => {
    const entry = await diaryRepository.upsertEntry({}, '2026-10-15');
    expect(await diaryRepository.getWordOfDay(entry.id)).toBeNull();
    await diaryRepository.setWordOfDay(entry.id, 'Resiliencia');
    expect(await diaryRepository.getWordOfDay(entry.id)).toBe('Resiliencia');
  });

  test('tags en lote (getTagsForEntries) y conteo (listTagsWithCounts)', async () => {
    const e1 = await diaryRepository.upsertEntry({}, '2026-10-14');
    const e2 = await diaryRepository.upsertEntry({}, '2026-10-15');
    await diaryRepository.syncTagsFromNotes(e1.id, 'Buen día #gym #salud');
    await diaryRepository.syncTagsFromNotes(e2.id, 'Otro día #gym');

    const map = await diaryRepository.getTagsForEntries([e1.id, e2.id]);
    expect(map[e1.id]).toEqual(['gym', 'salud']);
    expect(map[e2.id]).toEqual(['gym']);

    const counts = await diaryRepository.listTagsWithCounts();
    expect(counts.find((c) => c.name === 'gym')?.count).toBe(2);
    expect(counts.find((c) => c.name === 'salud')?.count).toBe(1);
    expect(counts[0]?.name).toBe('gym'); // más usado primero
  });

  test('searchDiary sanitiza sintaxis FTS5 y hace AND por tokens', async () => {
    await diaryRepository.upsertEntry({ notes: 'alegría intensa hoy' }, '2026-10-14');
    await diaryRepository.upsertEntry({ notes: 'alegría de vivir' }, '2026-10-15');
    await diaryRepository.upsertEntry({ notes: 'trabajo duro' }, '2026-10-16');

    // paréntesis sin cerrar = sintaxis FTS5 → no debe lanzar
    const weird = await diaryRepository.searchDiary('(alegría');
    expect(weird).toHaveLength(2);

    // AND por tokens: solo la entrada con ambos términos
    const both = await diaryRepository.searchDiary('alegría intensa');
    expect(both).toHaveLength(1);
    expect(both[0]?.entryDate).toBe('2026-10-14');

    // solo símbolos → sin resultados, sin error
    const symbols = await diaryRepository.searchDiary('???');
    expect(symbols).toHaveLength(0);
  });

  test('deleteEntry elimina entrada, hijos y devuelve archivos huérfanos', async () => {
    const entry = await diaryRepository.upsertEntry({ notes: 'Día #borrar' }, '2026-10-15');
    await diaryRepository.syncTagsFromNotes(entry.id, 'Día #borrar');
    await diaryRepository.addGratitude(entry.id, 'Una');
    await diaryRepository.setWellnessMetric(entry.id, 'water', 8, 'vasos');
    await diaryRepository.setWordOfDay(entry.id, 'Calma');
    await diaryRepository.setDayColor(entry.id, '#4E8C6A');

    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO photos (owner_type, owner_id, file_path, thumb_path, created_at) VALUES ('diary', ?, ?, ?, ?)",
      [entry.id, 'file:///a.jpg', 'file:///a_thumb.jpg', now],
    );
    await db.runAsync(
      'INSERT INTO audio_notes (entry_id, file_path, duration_s, created_at) VALUES (?, ?, ?, ?)',
      [entry.id, 'file:///a.m4a', 5, now],
    );
    await db.runAsync(
      'INSERT INTO sketches (entry_id, strokes, image_path, created_at) VALUES (?, ?, ?, ?)',
      [entry.id, '{"d":[]}', 'file:///s.png', now],
    );

    const { filePaths } = await diaryRepository.deleteEntry('2026-10-15');
    expect(filePaths).toHaveLength(4); // foto + thumb + audio + sketch
    expect(filePaths).toContain('file:///a.jpg');
    expect(filePaths).toContain('file:///a_thumb.jpg');
    expect(filePaths).toContain('file:///a.m4a');
    expect(filePaths).toContain('file:///s.png');

    expect(await diaryRepository.getEntryByDate('2026-10-15')).toBeNull();
    expect(await diaryRepository.getGratitudes(entry.id)).toHaveLength(0);
    expect(await diaryRepository.getWellnessMetrics(entry.id)).toHaveLength(0);
    expect(await diaryRepository.getWordOfDay(entry.id)).toBeNull();
    expect(await diaryRepository.getTagsOfEntry(entry.id)).toHaveLength(0);

    // FTS sincronizado por el trigger diary_ad
    expect(await diaryRepository.searchDiary('borrar')).toHaveLength(0);

    // fecha inexistente → no lanza
    expect((await diaryRepository.deleteEntry('1999-01-01')).filePaths).toHaveLength(0);
  });
});
