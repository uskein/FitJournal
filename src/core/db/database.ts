import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrator';
import { runSeedIfNeeded } from './seed';

/**
 * Único punto de apertura de la base de datos.
 * Fuente: README_ARQUITECTURA.md §3 · MODELO_DE_DATOS.md §3
 * Pragmas obligatorios: WAL (concurrencia), foreign_keys (integridad).
 */

const DB_NAME = 'fitjournal.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA synchronous = NORMAL;
      `);
      await runMigrations(db);
      await runSeedIfNeeded(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Solo para tests: limpia el cache de la instancia */
export function _resetDatabaseCache(): void {
  dbPromise = null;
}

/**
 * Verificación de integridad (mensual o tras import) — GUIA_DEVOPS_SEGURIDAD.md §8
 */
export async function integrityCheck(): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  return rows[0]?.integrity_check === 'ok';
}
