import { z } from 'zod';
import { isoDay } from './diarySchemas';

/**
 * Schemas del gimnasio — fuente: CONTRATOS_API.md §3
 * Reglas: RPE 1-10 · peso/reps positivos · orden explícito.
 */

export const rpeSchema = z.number().min(1).max(10);

export const setInputSchema = z.object({
  setNumber: z.number().int().min(1).max(50),
  weight: z.number().min(0).max(1500).nullish(),
  reps: z.number().int().min(0).max(500).nullish(),
  rpe: rpeSchema.nullish(),
  restSeconds: z.number().int().min(0).max(3600).nullish(),
});

export const routineExerciseInputSchema = z.object({
  exerciseId: z.number().int().positive(),
  orderIndex: z.number().int().min(0),
  targetSets: z.number().int().min(1).max(20).nullish(),
  targetReps: z.number().int().min(1).max(100).nullish(),
  targetWeight: z.number().min(0).max(1500).nullish(),
  restSeconds: z.number().int().min(0).max(3600).nullish(),
  notes: z.string().max(1000).nullish(),
});

export const routineInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).nullish(),
  exercises: z.array(routineExerciseInputSchema).max(30),
});

export const exerciseInputSchema = z.object({
  name: z.string().min(1).max(100),
  musclePrimary: z.string().min(1).max(50),
  muscleSecondary: z.string().max(100).nullish(),
  equipment: z.string().max(50).nullish(),
  type: z.enum(['compuesto', 'aislamiento']).nullish(),
  instructions: z.string().max(5000).nullish(),
  imagePath: z.string().max(1000).nullish(),
  videoUrl: z.string().max(500).nullish(),
  skillLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullish(),
  effortLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullish(),
  muscleZones: z.string().max(500).nullish(),
  healthBenefits: z.string().max(2000).nullish(),
});

export const sessionDateSchema = isoDay;

export type SetInputParsed = z.infer<typeof setInputSchema>;
export type RoutineInputParsed = z.infer<typeof routineInputSchema>;
export type ExerciseInputParsed = z.infer<typeof exerciseInputSchema>;
