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
  sleep_quality: number | null;
  body_weight: number | null;
  weather: string | null;
  weather_icon: string | null;
  notes: string | null;
  is_closed: number;
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
    sleepQuality: (row.sleep_quality as DiaryEntry['sleepQuality']) ?? null,
    bodyWeight: row.body_weight,
    weather: row.weather,
    weatherIcon: row.weather_icon,
    notes: row.notes,
    isClosed: !!row.is_closed,
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

  /** Elimina una gratitud individual */
  async deleteGratitude(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM gratitude_items WHERE id = ?', [id]);
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

  async getWordOfDay(entryId: number): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ word: string }>(
      'SELECT word FROM word_of_day WHERE entry_id = ?',
      [entryId],
    );
    return row?.word ?? null;
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

  /** Upsert de métrica: reemplaza el valor previo del mismo tipo (sin duplicados) */
  async setWellnessMetric(
    entryId: number,
    metric: WellnessMetricParsed['metric'],
    value: number | null,
    unit: string | null,
  ): Promise<void> {
    const parsed = wellnessMetricSchema.parse({ metric, value, unit });
    const db = await getDatabase();
    await db.runAsync('DELETE FROM wellness_metrics WHERE entry_id = ? AND metric = ?', [
      entryId,
      parsed.metric,
    ]);
    if (parsed.value != null) {
      await db.runAsync(
        'INSERT INTO wellness_metrics (entry_id, metric, value, unit) VALUES (?, ?, ?, ?)',
        [entryId, parsed.metric, parsed.value, parsed.unit ?? null],
      );
    }
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

  /** Búsqueda full-text (FTS5) sobre notas + coincidencia por etiquetas.
   *  Sanitiza por token (evita errores de sintaxis FTS5 con caracteres
   *  especiales) y hace fallback a LIKE si MATCH falla. */
  async searchDiary(query: string): Promise<DiaryEntry[]> {
    const q = searchQuerySchema.parse(query);
    const db = await getDatabase();

    const tokens = q.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
    const ftsRows: DiaryRow[] = [];

    if (tokens.length > 0) {
      const match = tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(' AND ');
      try {
        const rows = await db.getAllAsync<DiaryRow>(
          `SELECT de.* FROM diary_fts fts
           JOIN diary_entries de ON de.id = fts.rowid
           WHERE diary_fts MATCH ?
           ORDER BY rank`,
          [match],
        );
        ftsRows.push(...rows);
      } catch {
        const rows = await db.getAllAsync<DiaryRow>(
          'SELECT * FROM diary_entries WHERE LOWER(notes) LIKE ? ORDER BY entry_date DESC',
          [`%${q.toLowerCase()}%`],
        );
        ftsRows.push(...rows);
      }
    }

    // Coincidencia por etiquetas (#tag o texto que case con un tag)
    const tagLike = `%${q.trim().toLowerCase().replace(/[%_]/g, '')}%`;
    const tagRows = await db.getAllAsync<DiaryRow>(
      `SELECT de.* FROM diary_entries de
       JOIN diary_entry_tags det ON det.entry_id = de.id
       JOIN tags t ON t.id = det.tag_id
       WHERE LOWER(t.name) LIKE ?
       ORDER BY de.entry_date DESC`,
      [tagLike],
    );

    const seen = new Set<number>();
    const merged: DiaryRow[] = [];
    for (const r of [...ftsRows, ...tagRows]) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    return merged.map(toEntry);
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

  /** Tags en lote para pintar tarjetas (una sola query) */
  async getTagsForEntries(entryIds: number[]): Promise<Record<number, string[]>> {
    if (entryIds.length === 0) return {};
    const db = await getDatabase();
    const placeholders = entryIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ entry_id: number; name: string }>(
      `SELECT det.entry_id, t.name FROM diary_entry_tags det
       JOIN tags t ON t.id = det.tag_id
       WHERE det.entry_id IN (${placeholders}) ORDER BY t.name`,
      entryIds,
    );
    const map: Record<number, string[]> = {};
    for (const r of rows) {
      const list = map[r.entry_id];
      if (list) list.push(r.name);
      else map[r.entry_id] = [r.name];
    }
    return map;
  },

  /** Etiquetas usadas con conteo (chips de filtro) */
  async listTagsWithCounts(): Promise<Array<{ name: string; count: number }>> {
    const db = await getDatabase();
    return db.getAllAsync<{ name: string; count: number }>(
      `SELECT t.name AS name, COUNT(*) AS count FROM tags t
       JOIN diary_entry_tags det ON det.tag_id = t.id
       JOIN diary_entries de ON de.id = det.entry_id
       GROUP BY t.id ORDER BY count DESC, t.name ASC LIMIT 20`,
    );
  },

  /** Cierra el día (marca como completado) */
  async closeDay(date: string): Promise<void> {
    isoDay.parse(date);
    const db = await getDatabase();
    await db.runAsync('UPDATE diary_entries SET is_closed = 1, updated_at = ? WHERE entry_date = ?', [
      new Date().toISOString(), date,
    ]);
  },

  /**
   * Elimina la entrada del día y todos sus hijos (gratitudes, métricas,
   * mood, palabra del día, color, tags, sketches, audios y fotos).
   * Devuelve las rutas de archivos huérfanos para borrarlas del disco
   * (el FS no vive en la capa de datos).
   */
  async deleteEntry(date: string): Promise<{ filePaths: string[] }> {
    isoDay.parse(date);
    const db = await getDatabase();
    const entry = await this.getEntryByDate(date);
    if (!entry) return { filePaths: [] };

    const photos = await db.getAllAsync<{ file_path: string; thumb_path: string | null }>(
      "SELECT file_path, thumb_path FROM photos WHERE owner_type = 'diary' AND owner_id = ?",
      [entry.id],
    );
    const audios = await db.getAllAsync<{ file_path: string }>(
      'SELECT file_path FROM audio_notes WHERE entry_id = ?',
      [entry.id],
    );
    const sketches = await db.getAllAsync<{ image_path: string | null }>(
      'SELECT image_path FROM sketches WHERE entry_id = ?',
      [entry.id],
    );

    const filePaths = [
      ...photos.flatMap((p) => [p.file_path, p.thumb_path]),
      ...audios.map((a) => a.file_path),
      ...sketches.map((s) => s.image_path),
    ].filter((p): p is string => !!p);

    // Hijos primero (los que no tienen FK cascade), luego la entrada.
    // El trigger diary_ad mantiene diary_fts en sincronía.
    await db.runAsync('DELETE FROM gratitude_items WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM wellness_metrics WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM mood_entries WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM word_of_day WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM day_colors WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM diary_entry_tags WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM sketches WHERE entry_id = ?', [entry.id]);
    await db.runAsync('DELETE FROM audio_notes WHERE entry_id = ?', [entry.id]);
    await db.runAsync("DELETE FROM photos WHERE owner_type = 'diary' AND owner_id = ?", [entry.id]);
    await db.runAsync('DELETE FROM diary_entries WHERE id = ?', [entry.id]);

    return { filePaths };
  },

  /** Racha de días consecutivos con entrada de diario */
  async getWritingStreak(): Promise<number> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ entry_date: string }>(
      'SELECT entry_date FROM diary_entries ORDER BY entry_date DESC',
    );
    if (rows.length === 0) return 0;

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (rows[i]?.entry_date === fmt(expected)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  /** Estadísticas del diario */
  async getStats(): Promise<{ totalEntries: number; totalWords: number; totalGratitude: number; totalPhotos: number }> {
    const db = await getDatabase();
    const entries = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM diary_entries');
    const words = await db.getFirstAsync<{ n: number }>(
      "SELECT SUM(LENGTH(notes) - LENGTH(REPLACE(notes, ' ', '')) + 1) AS n FROM diary_entries WHERE notes IS NOT NULL AND notes != ''"
    );
    const gratitude = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM gratitude_items');
    const photos = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM photos WHERE owner_type = 'diary'");
    return {
      totalEntries: entries?.n ?? 0,
      totalWords: words?.n ?? 0,
      totalGratitude: gratitude?.n ?? 0,
      totalPhotos: photos?.n ?? 0,
    };
  },

  /** Prompts aleatorios para "Inspírame" */
  async getRandomPrompt(): Promise<string> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ text: string }>('SELECT text FROM journal_prompts ORDER BY RANDOM() LIMIT 1');
    return row?.text ?? '¿Qué te hizo sonreír hoy?';
  },

  // ── Plantillas guiadas (incluye las propias del usuario) ──
  async listTemplates(): Promise<Array<{ id: number; name: string; questions: string[]; isBuiltin: boolean }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; name: string; questions: string; is_builtin: number }>(
      'SELECT id, name, questions, is_builtin FROM journal_templates ORDER BY is_builtin DESC, name ASC',
    );
    return rows.map((r) => {
      let questions: string[] = [];
      try { questions = JSON.parse(r.questions); } catch { questions = [r.questions]; }
      return { id: r.id, name: r.name, questions, isBuiltin: !!r.is_builtin };
    });
  },

  async createTemplate(name: string, questions: string[]): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO journal_templates (name, questions, is_builtin, created_at) VALUES (?, ?, 0, ?)',
      [name, JSON.stringify(questions), new Date().toISOString()],
    );
  },

  async deleteTemplate(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM journal_templates WHERE id = ? AND is_builtin = 0', [id]);
  },
};
