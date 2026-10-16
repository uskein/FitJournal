import { z } from 'zod';

/**
 * Schemas del diario — fuente: CONTRATOS_API.md §1.3, §2
 * Toda escritura pasa por aquí ANTES de tocar la DB (Security by Design).
 */

const moodLevel = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida: usa YYYY-MM-DD');

export const diaryEntryInputSchema = z.object({
  mood: moodLevel.nullish(),
  energy: moodLevel.nullish(),
  sleepHours: z.number().min(0).max(24).nullish(),
  bodyWeight: z.number().positive().max(700).nullish(),
  weather: z.string().max(50).nullish(),
  notes: z.string().max(20000).nullish(),
});

export const moodInputSchema = z.object({
  emotion: z.string().min(1).max(50),
  intensity: moodLevel,
  context: z.string().max(50).nullish(),
});

/** Regla de negocio: máx. 500 chars por gratitud (CHECK en DB + Zod) */
export const gratitudeTextSchema = z.string().min(1).max(500);

/** Métricas de bienestar permitidas */
export const wellnessMetricSchema = z.object({
  metric: z.enum(['water', 'meditation', 'steps', 'reading']),
  value: z.number().min(0).max(100000).nullish(),
  unit: z.string().max(20).nullish(),
});

export const wordOfDaySchema = z.string().min(1).max(60);

/** Color del día: debe pertenecer a la paleta cerrada del manual (se valida en repo con moodColors) */
export const dayColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const searchQuerySchema = z.string().min(1).max(200);

export type DiaryEntryInputParsed = z.infer<typeof diaryEntryInputSchema>;
export type MoodInputParsed = z.infer<typeof moodInputSchema>;
export type WellnessMetricParsed = z.infer<typeof wellnessMetricSchema>;
