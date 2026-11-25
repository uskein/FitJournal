/**
 * shot.mjs — captura de pantalla binary-safe desde el host.
 * PowerShell `>` corrompe PNG; aquí el stdout de `adb exec-out` se escribe
 * como buffer crudo.
 *
 * Uso:  node shot.mjs <nombre-salida> [segundos-espera]
 * Sale en Artefactos/presentacion/screenshots/<nombre>.png
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');

const name = process.argv[2];
if (!name) {
  console.error('Uso: node shot.mjs <nombre> [espera-seg]');
  process.exit(1);
}
const waitSec = Number(process.argv[3] ?? 1);
if (waitSec > 0) spawnSync('powershell', ['-c', `Start-Sleep ${waitSec}`]);

const res = spawnSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
if (res.status !== 0 || !res.stdout?.length) {
  console.error('screencap falló:', res.stderr?.toString());
  process.exit(1);
}
const png = res.stdout;
if (png[0] !== 0x89 || png[1] !== 0x50) {
  console.error('Salida no es PNG válido');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, `${name}.png`);
writeFileSync(file, png);
console.log(`OK ${file} (${png.length} bytes)`);
