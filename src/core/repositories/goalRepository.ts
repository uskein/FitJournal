import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import type { Goal } from '@/core/types';
import { z } from 'zod';

/**
 * goalRepository — fuente: CONTRATOS_API.md §4
 * Metas con progreso 0..1 y estado active|done|archived.
 */

const goalInputSchema = z.object({
  title: z.string().min(1).max(200),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
});

const goalStatusSchema = z.enum(['active', 'done', 'archived']);

interface GoalRow {
  id: number;
  title: string;
  target_date: string | null;
  progress: number;
  status: 'active' | 'done' | 'archived';
  created_at: string;
}

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    title: r.title,
    targetDate: r.target_date,
    progress: r.progress,
    status: r.status,
    createdAt: r.created_at,
  };
}

export const goalRepository = {
  async listGoals(status?: Goal['status']): Promise<Goal[]> {
    const db = await getDatabase();
    if (status) {
      goalStatusSchema.parse(status);
      const rows = await db.getAllAsync<GoalRow>(
        'SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC',
        [status],
      );
      return rows.map(toGoal);
    }
    const rows = await db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY created_at DESC');
    return rows.map(toGoal);
  },

  async createGoal(input: unknown): Promise<Goal> {
    const parsed = goalInputSchema.parse(input);
    const db = await getDatabase();
    const now = new Date().toISOString();
    const res = await db.runAsync(
      "INSERT INTO goals (title, target_date, progress, status, created_at) VALUES (?, ?, 0, 'active', ?)",
      [parsed.title, parsed.targetDate ?? null, now],
    );
    return {
      id: Number(res.lastInsertRowId),
      title: parsed.title,
      targetDate: parsed.targetDate ?? null,
      progress: 0,
      status: 'active',
      createdAt: now,
    };
  },

  async updateGoalProgress(goalId: number, progress: number): Promise<void> {
    if (progress < 0 || progress > 1) {
      throw new AppError('VALIDATION', 'El progreso debe estar entre 0 y 1');
    }
    const db = await getDatabase();
    const existing = await db.getFirstAsync<GoalRow>('SELECT * FROM goals WHERE id = ?', [goalId]);
    if (!existing) throw new AppError('NOT_FOUND', 'Meta inexistente');

    const status = progress >= 1 ? 'done' : existing.status === 'done' ? 'active' : existing.status;
    await db.runAsync('UPDATE goals SET progress = ?, status = ? WHERE id = ?', [progress, status, goalId]);
  },
};
