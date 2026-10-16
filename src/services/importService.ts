import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import { diaryEntryInputSchema } from '@/core/validation/diarySchemas';
import { z } from 'zod';

/**
 * importService — HU-16 · borde B9 · GUIA_DEVOPS §5 (M9)
 * Importa un respaldo JSON validando ANTES de escribir (Zod completo),
 * dentro de una transacción con rollback. Nunca corrompe la DB actual.
 */

const backupSchema = z.object({
  meta: z.object({
    app: z.string(),
    schemaVersion: z.number(),
    exportedAt: z.string(),
  }),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});

export interface ImportResult {
  ok: boolean;
  imported: Record<string, number>;
  errors: string[];
}

export const importService = {
  /** Valida la estructura del backup sin tocar la DB */
  validateBackup(json: unknown): { valid: boolean; errors: string[] } {
    const result = backupSchema.safeParse(json);
    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      };
    }
    if (result.data.meta.app !== 'FitJournal') {
      return { valid: false, errors: ['El archivo no es un respaldo de FitJournal'] };
    }
    // B9: validar filas de diary_entries con Zod antes de importar
    const entries = result.data.tables['diary_entries'] ?? [];
    const entryErrors: string[] = [];
    for (const [i, row] of entries.entries()) {
      const parsed = diaryEntryInputSchema.safeParse(row);
      if (!parsed.success) {
        entryErrors.push(`diary_entries[${i}]: entrada inválida`);
      }
    }
    return { valid: entryErrors.length === 0, errors: entryErrors };
  },

  /**
   * Importa dentro de una transacción. Si algo falla → ROLLBACK completo.
   * ESTRATEGIA MVP: fusiona por UPSERT en diary_entries (no destruye lo existente).
   */
  async importBackup(json: unknown): Promise<ImportResult> {
    const validation = this.validateBackup(json);
    if (!validation.valid) {
      throw new AppError('VALIDATION', `Respaldo inválido: ${validation.errors[0]}`, validation.errors);
    }

    const payload = backupSchema.parse(json);
    const db = await getDatabase();
    const imported: Record<string, number> = {};

    try {
      await db.withTransactionAsync(async () => {
        const entries = payload.tables['diary_entries'] ?? [];
        for (const raw of entries) {
          const row = raw as Record<string, unknown>;
          const now = new Date().toISOString();
          await db.runAsync(
            `INSERT INTO diary_entries (entry_date, mood, energy, sleep_hours, body_weight, weather, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(entry_date) DO UPDATE SET
               mood = COALESCE(excluded.mood, diary_entries.mood),
               energy = COALESCE(excluded.energy, diary_entries.energy),
               sleep_hours = COALESCE(excluded.sleep_hours, diary_entries.sleep_hours),
               body_weight = COALESCE(excluded.body_weight, diary_entries.body_weight),
               notes = COALESCE(excluded.notes, diary_entries.notes),
               updated_at = excluded.updated_at`,
            [
              row['entry_date'] as string,
              (row['mood'] as number) ?? null,
              (row['energy'] as number) ?? null,
              (row['sleep_hours'] as number) ?? null,
              (row['body_weight'] as number) ?? null,
              (row['weather'] as string) ?? null,
              (row['notes'] as string) ?? null,
              (row['created_at'] as string) ?? now,
              now,
            ],
          );
        }
        imported['diary_entries'] = entries.length;

        const habits = payload.tables['habits'] ?? [];
        for (const raw of habits) {
          const row = raw as Record<string, unknown>;
          await db.runAsync(
            `INSERT INTO habits (name, icon, color, is_active, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(name) DO NOTHING`,
            [row['name'] as string, (row['icon'] as string) ?? null, (row['color'] as string) ?? null, (row['is_active'] as number) ?? 1, (row['created_at'] as string) ?? new Date().toISOString()],
          );
        }
        imported['habits'] = habits.length;
      });

      return { ok: true, imported, errors: [] };
    } catch (e) {
      // ROLLBACK automático de withTransactionAsync
      throw new AppError('DB_ERROR', 'La importación falló y se revirtió (rollback)', e);
    }
  },
};
