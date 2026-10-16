import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import type { DiaryEntry, DiaryEntryInput, GratitudeItem, MoodEntry, MoodInput, WellnessMetric } from '@/core/types';
import {
  diaryEntryInputSchema,
  gratitudeTextSchema,
  isoDay,
  moodInputSchema,
  searchQuerySchema,
  wellnessMetricSchema,
  wordOfDaySchema,
  dayColorSchema,
  type WellnessMetricParsed,
} from '@/core/validation/diarySchemas';
import { moodColors } from '@/theme/tokens';

/**
 * diaryRepository — fuente: CONTRATOS_API.md §2
 * ÚNICA puerta a los datos del diario. Toda escritura se valida con Zod.
 * Regla: una entrada por día (UPSERT por entry_date).
 */

interface DiaryRow {
  id: number;
  entry_date: string;
  mood: number | null;
  energy: number | null;
  sleep_hours: number | null;
  body_weight: number | null;
  weather: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    mood: (row.mood as DiaryEntry['mood']) ?? null,
    energy: (row.energy as DiaryEntry['energy']) ?? null,
    sleepHours: row.sleep_hours,
    bodyWeight: row.body_weight,
    weather: row.weather,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const diaryRepository = {
  async getEntryByDate(date: string): Promise<DiaryEntry | null> {
    isoDay.parse(date);
    const db = await getDatabase();
    const row = await db.getFirstAsync<DiaryRow>(
      'SELECT * FROM diary_entries WHERE entry_date = ?',
      [date],
    );
    return row ? toEntry(row) : null;
  },

  /** Crea o actualiza la entrada del día (regla de negocio 1) */
  async upsertEntry(input: DiaryEntryInput, date: string): Promise<DiaryEntry> {
    isoDay.parse(date);
    const parsed = diaryEntryInputSchema.parse(input);
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO diary_entries (entry_date, mood, energy, sleep_hours, body_weight, weather, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(entry_date) DO UPDATE SET
         mood = COALESCE(excluded.mood, diary_entries.mood),
         energy = COALESCE(excluded.energy, diary_entries.energy),
         sleep_hours = COALESCE(excluded.sleep_hours, diary_entries.sleep_hours),
         body_weight = COALESCE(excluded.body_weight, diary_entries.body_weight),
         weather = COALESCE(excluded.weather, diary_entries.weather),
         notes = COALESCE(excluded.notes, diary_entries.notes),
         updated_at = excluded.updated_at`,
      [
        date,
        parsed.mood ?? null,
        parsed.energy ?? null,
        parsed.sleepHours ?? null,
        parsed.bodyWeight ?? null,
        parsed.weather ?? null,
        parsed.notes ?? null,
        now,
        now,
      ],
    );

    const entry = await this.getEntryByDate(date);
    if (!entry) throw new AppError('DB_ERROR', 'No se pudo guardar la entrada del día');
    return entry;
  },

  async listEntriesByRange(from: string, to: string): Promise<DiaryEntry[]> {
    isoDay.parse(from);
    isoDay.parse(to);
    const db = await getDatabase();
    const rows = await db.getAllAsync<DiaryRow>(
      'SELECT * FROM diary_entries WHERE entry_date BETWEEN ? AND ? ORDER BY entry_date DESC',
      [from, to],
    );
    return rows.map(toEntry);
  },

  /** Regla: máx. 5 gratitudes por día */
  async addGratitude(entryId: number, text: string): Promise<GratitudeItem> {
    const parsedText = gratitudeTextSchema.parse(text);
    const db = await getDatabase();

    const count = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM gratitude_items WHERE entry_id = ?',
      [entryId],
    );
    if ((count?.n ?? 0) >= 5) {
      throw new AppError('CONFLICT', 'El día ya está lleno de cosas buenas (máx. 5 gratitudes)');
    }

    const now = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO gratitude_items (entry_id, text, created_at) VALUES (?, ?, ?)',
      [entryId, parsedText, now],
    );
    return { id: Number(result.lastInsertRowId), entryId, text: parsedText, createdAt: now };
  },

  async addMood(entryId: number, mood: MoodInput): Promise<void> {
    const parsed = moodInputSchema.parse(mood);
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO mood_entries (entry_id, emotion, intensity, context) VALUES (?, ?, ?, ?)',
      [entryId, parsed.emotion, parsed.intensity, parsed.context ?? null],
    );
  },

  async setWordOfDay(entryId: number, word: string): Promise<void> {
    const parsed = wordOfDaySchema.parse(word);
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO word_of_day (entry_id, word) VALUES (?, ?)
       ON CONFLICT(entry_id) DO UPDATE SET word = excluded.word`,
      [entryId, parsed],
    );
  },

  /** Color del día: DEBE pertenecer a la paleta cerrada (manual Skill 1) */
  async setDayColor(entryId: number, color: string): Promise<void> {
    dayColorSchema.parse(color);
    if (!(moodColors as readonly string[]).includes(color)) {
      throw new AppError('VALIDATION', 'Color fuera de la paleta cerrada de mood colors');
    }
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO day_colors (entry_id, color) VALUES (?, ?)
       ON CONFLICT(entry_id) DO UPDATE SET color = excluded.color`,
      [entryId, color],
    );
  },

  async addWellnessMetric(entryId: number, metric: WellnessMetricParsed): Promise<void> {
    const parsed = wellnessMetricSchema.parse(metric);
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO wellness_metrics (entry_id, metric, value, unit) VALUES (?, ?, ?, ?)',
      [entryId, parsed.metric, parsed.value ?? null, parsed.unit ?? null],
    );
  },

  async getWellnessMetrics(entryId: number): Promise<WellnessMetric[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      entry_id: number;
      metric: WellnessMetric['metric'];
      value: number | null;
      unit: string | null;
    }>('SELECT * FROM wellness_metrics WHERE entry_id = ?', [entryId]);
    return rows.map((r) => ({
      id: r.id,
      entryId: r.entry_id,
      metric: r.metric,
      value: r.value,
      unit: r.unit,
    }));
  },

  async getGratitudes(entryId: number): Promise<GratitudeItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; entry_id: number; text: string; created_at: string }>(
      'SELECT * FROM gratitude_items WHERE entry_id = ? ORDER BY created_at',
      [entryId],
    );
    return rows.map((r) => ({ id: r.id, entryId: r.entry_id, text: r.text, createdAt: r.created_at }));
  },

  /** Búsqueda full-text sobre notas del diario (FTS5) */
  async searchDiary(query: string): Promise<DiaryEntry[]> {
    const q = searchQuerySchema.parse(query);
    const db = await getDatabase();
    const rows = await db.getAllAsync<DiaryRow>(
      `SELECT de.* FROM diary_fts fts
       JOIN diary_entries de ON de.id = fts.rowid
       WHERE diary_fts MATCH ?
       ORDER BY rank`,
      [q],
    );
    return rows.map(toEntry);
  },

  async getMoods(entryId: number): Promise<MoodEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number;
      entry_id: number;
      emotion: string;
      intensity: number;
      context: string | null;
    }>('SELECT * FROM mood_entries WHERE entry_id = ?', [entryId]);
    return rows.map((r) => ({
      id: r.id,
      entryId: r.entry_id,
      emotion: r.emotion,
      intensity: r.intensity as MoodEntry['intensity'],
      context: r.context,
    }));
  },

  /**
   * Sincroniza #etiquetas desde el texto de notas (HU-06/#tags).
   * Extrae palabras que empiezan por #, reemplaza los tags de la entrada.
   */
  async syncTagsFromNotes(entryId: number, notes: string | null): Promise<string[]> {
    const db = await getDatabase();
    const found = [...new Set((notes ?? '').match(/#[\p{L}\p{N}_]{2,30}/gu) ?? [])].map((t) =>
      t.slice(1).toLowerCase(),
    );

    await db.runAsync('DELETE FROM diary_entry_tags WHERE entry_id = ?', [entryId]);
    for (const name of found) {
      await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name]);
      await db.runAsync(
        `INSERT INTO diary_entry_tags (entry_id, tag_id)
         SELECT ?, id FROM tags WHERE name = ?`,
        [entryId, name],
      );
    }
    return found;
  },

  async getTagsOfEntry(entryId: number): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string }>(
      `SELECT t.name FROM tags t
       JOIN diary_entry_tags det ON det.tag_id = t.id
       WHERE det.entry_id = ? ORDER BY t.name`,
      [entryId],
    );
    return rows.map((r) => r.name);
  },
};
