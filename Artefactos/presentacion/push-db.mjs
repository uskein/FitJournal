/**
 * push-db.mjs — sube la BD sembrada al emulador de forma binary-safe.
 * Borra -wal/-shm (obsoletos tras el checkpoint) y escribe fitjournal.db
 * dentro del sandbox de la app vía `run-as` + stdin.
 *
 * Uso: node push-db.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const PKG = 'com.diariofit.app';
const REMOTE = 'files/SQLite';
const LOCAL = join(dirname(fileURLToPath(import.meta.url)), 'db', 'fitjournal.db');

const run = (args, opts = {}) => {
  const r = spawnSync(ADB, args, { maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0) {
    console.error(`FAIL: adb ${args.join(' ')}\n${r.stderr?.toString().trim()}`);
    process.exit(1);
  }
  return r.stdout;
};

// 1. limpiar wal/shm obsoletos
run(['shell', `run-as ${PKG} sh -c 'rm -f ${REMOTE}/fitjournal.db-wal ${REMOTE}/fitjournal.db-shm'`]);
console.log('wal/shm eliminados');

// 2. subir el .db por stdin (binary-safe: exec-in)
const dbBytes = readFileSync(LOCAL);
const push = spawnSync(ADB, ['exec-in', `run-as ${PKG} sh -c 'cat > ${REMOTE}/fitjournal.db'`], {
  input: dbBytes,
  maxBuffer: 64 * 1024 * 1024,
});
if (push.status !== 0) {
  // fallback: push a /sdcard y pipe dentro del sandbox
  console.log('exec-in no disponible, usando fallback sdcard+pipe');
  spawnSync(ADB, ['push', LOCAL, '/sdcard/fitjournal.db'], { stdio: 'inherit' });
  run(['shell', `cat /sdcard/fitjournal.db | run-as ${PKG} sh -c 'cat > ${REMOTE}/fitjournal.db'`]);
  run(['shell', 'rm -f /sdcard/fitjournal.db']);
} else {
  console.log(`push OK (${dbBytes.length} bytes)`);
}

// 3. ownership + permisos (app uid, 600 como el original)
run(['shell', `run-as ${PKG} sh -c 'ls -la ${REMOTE}/'`]);

// 4. verificar tamaño remoto
const out = run(['shell', `run-as ${PKG} sh -c 'stat -c %s ${REMOTE}/fitjournal.db'`]).toString().trim();
console.log(`remoto = ${out} bytes | local = ${dbBytes.length} bytes`);
if (Number(out) !== dbBytes.length) {
  console.error('TAMAÑO NO COINCIDE');
  process.exit(1);
}
console.log('push-db OK');
