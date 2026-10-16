import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

/**
 * Migrador versionado — MODELO_DE_DATOS.md §4
 * - `PRAGMA user_version` guarda la última migración aplicada.
 * - Nunca se edita una migración ya aplicada: siempre NNN+1.
 * - Cada migración corre en transacción: si falla, se revierte y user_version no avanza.
 */

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;

    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
