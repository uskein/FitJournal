/** Utilidades de fecha — todas las fechas de la app son 'YYYY-MM-DD' locales */

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isoDayOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "jueves 15 de octubre" — cabecera de la tab Hoy */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return `${DIAS[date.getDay()]} ${d} de ${MESES[m - 1]}`;
}

/** "JUEVES 15 DE OCTUBRE" — kicker editorial de la tab Hoy */
export function kickerDate(iso: string): string {
  return longDate(iso).toUpperCase();
}

/** Mapea mood 1..5 al índice de la paleta cerrada moodColors (manual Skill 1) */
export function moodToColorIndex(mood: number | null): number | null {
  if (!mood || mood < 1 || mood > 5) return null;
  // moodColors: [muy bien, bien, neutral, bajo, mal, ansioso, cansado]
  const map: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 };
  return map[mood] ?? null;
}
