/**
 * Utilidades de sketches — HU-15
 * Los trazos se guardan en píxeles absolutos del lienzo del dispositivo
 * (locationX/locationY), así que renderizar con un viewBox fijo recorta el
 * dibujo según el tamaño del dispositivo. `pathsBBox` calcula la caja
 * envolvente real de los trazos para que nada se corte en ninguna pantalla.
 */

/** viewBox SVG ("x y width height") derivado de los trazos, o null si no hay trazos */
export function pathsBBox(paths: Array<string | null | undefined>, padding = 14): string | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  for (const d of paths) {
    if (!d) continue;
    // Solo hay comandos M/L → todos los números son pares (x, y)
    const nums = d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i]);
      const y = Number(nums[i + 1]);
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      found = true;
    }
  }

  if (!found) return null;
  const x = round(minX - padding);
  const y = round(minY - padding);
  const width = Math.max(1, round(maxX - minX + padding * 2));
  const height = Math.max(1, round(maxY - minY + padding * 2));
  return `${x} ${y} ${width} ${height}`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
