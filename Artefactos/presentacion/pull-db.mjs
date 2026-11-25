/**
 * pull-db.mjs — descarga binaria-safe de la BD del emulador vía run-as.
 * Uso: node pull-db.mjs            (fitjournal.db + -wal + -shm → ./db/)
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const PKG = 'com.diariofit.app';
const REMOTE = 'files/SQLite';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'db');

mkdirSync(OUT_DIR, { recursive: true });

for (const f of ['fitjournal.db', 'fitjournal.db-wal', 'fitjournal.db-shm']) {
  const res = spawnSync(ADB, ['exec-out', 'run-as', PKG, 'cat', `${REMOTE}/${f}`], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    console.error(`${f}: falló (${res.stderr?.toString().trim()})`);
    process.exit(1);
  }
  const buf = res.stdout;
  writeFileSync(join(OUT_DIR, f), buf);
  console.log(`${f}: ${buf.length} bytes`);
}
