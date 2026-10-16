import Database from 'better-sqlite3';
import { runMigrations } from '../migrator';
import { runSeedIfNeeded } from '../seed';

/**
 * Mock de expo-sqlite para Jest — Sprint 2 (PLAN_DE_SPRINTS.md §2.9)
 * Usa better-sqlite3 (SQLite real en memoria, con FTS5) envuelto en la
 * API async de expo-sqlite. Así los repositorios se prueban contra el
 * MISMO esquema real (001_init) sin dispositivo.
 */

type Params = unknown[];

interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface TestSQLiteDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: Params): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: Params): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: Params): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

export function createTestDatabase(): TestSQLiteDatabase {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const adapter: TestSQLiteDatabase = {
    async execAsync(sql: string): Promise<void> {
      db.exec(sql);
    },
    async runAsync(sql: string, params: Params = []) {
      const info = db.prepare(sql).run(...(params as never[]));
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    async getAllAsync<T>(sql: string, params: Params = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async getFirstAsync<T>(sql: string, params: Params = []) {
      return (db.prepare(sql).get(...(params as never[])) as T | undefined) ?? null;
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return adapter;
}

/** Singleton en memoria para tests (mismo esquema en todo el suite) */
let testDb: TestSQLiteDatabase | null = null;

export async function openDatabaseAsync(): Promise<TestSQLiteDatabase> {
  if (!testDb) {
    testDb = createTestDatabase();
    await runMigrations(testDb as never);
    await runSeedIfNeeded(testDb as never);
  }
  return testDb;
}

export function _resetTestDatabase(): void {
  testDb = null;
}
