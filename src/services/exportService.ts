import { Directory, File, Paths } from 'expo-file-system';
import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';

/**
 * exportService — HU-16 · CONTRATOS_API §7 · flujo F4
 * Exporta TODAS las tablas a JSON + empaqueta los archivos de media (fotos/voz)
 * en un ZIP local. El usuario posee sus datos (promesa local-first).
 */

const TABLES = [
  'diary_entries', 'tags', 'diary_entry_tags', 'mood_entries', 'gratitude_items',
  'wellness_metrics', 'word_of_day', 'day_colors', 'audio_notes', 'sketches',
  'habits', 'habit_logs', 'goals', 'goal_logs', 'journal_templates', 'journal_prompts',
  'exercises', 'routines', 'routine_exercises', 'workout_sessions',
  'session_exercises', 'session_sets', 'photos', 'settings',
] as const;

interface BackupMeta {
  app: string;
  schemaVersion: number;
  exportedAt: string;
}

export interface BackupPayload {
  meta: BackupMeta;
  tables: Record<string, unknown[]>;
}

export const exportService = {
  /** Vuelca todas las tablas a un objeto JSON */
  async dumpAll(): Promise<BackupPayload> {
    const db = await getDatabase();
    const tables: Record<string, unknown[]> = {};

    for (const t of TABLES) {
      tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
    }

    const ver = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    return {
      meta: {
        app: 'DiarioFit',
        schemaVersion: ver?.user_version ?? 0,
        exportedAt: new Date().toISOString(),
      },
      tables,
    };
  },

  /**
   * Genera el respaldo completo: JSON de todas las tablas → ruta del archivo.
   * El Share Sheet del sistema lo entrega al usuario (F4).
   * NOTA: ZIP de media se añadirá en una fase posterior (requiere librería adicional).
   */
  async exportBackup(): Promise<string> {
    try {
      const payload = await this.dumpAll();

      const exportDir = new Directory(Paths.document, 'exports');
      if (!exportDir.exists) exportDir.create({ intermediates: true, idempotent: true });

      const stamp = new Date().toISOString().slice(0, 10);
      const jsonFile = new File(exportDir, `DiarioFit-${stamp}.json`);
      jsonFile.write(JSON.stringify(payload));

      return jsonFile.uri;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError('DB_ERROR', 'No se pudo generar el respaldo', e);
    }
  },
};
