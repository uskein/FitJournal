import { getDatabase } from '@/core/db/database';
import { z } from 'zod';

/**
 * settingsRepository — fuente: CONTRATOS_API.md §8
 * Claves conocidas: theme, biometric_lock, seed_version, onboarding_done, reminder_time.
 * Todo el dato de preferencias vive en SQLite → se exporta con el respaldo.
 */

const keySchema = z.string().min(1).max(50);

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    keySchema.parse(key);
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    keySchema.parse(key);
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
