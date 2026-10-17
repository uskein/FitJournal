import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import type { Habit, HabitLog } from '@/core/types';
import { isoDay } from '@/core/validation/diarySchemas';
import { z } from 'zod';

/**
 * habitRepository — fuente: CONTRATOS_API.md §4
 * getStreak cuenta días CONSECUTivos con done=1 hacia atrás desde hoy.
 */

const habitInputSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().max(10).nullish(),
  color: z.string().max(20).nullish(),
});

interface HabitRow {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  is_active: number;
  created_at: string;
}

function toHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    isActive: !!r.is_active,
    createdAt: r.created_at,
  };
}

export const habitRepository = {
  async listActiveHabits(): Promise<Habit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<HabitRow>(
      'SELECT * FROM habits WHERE is_active = 1 ORDER BY created_at',
    );
    return rows.map(toHabit);
  },

  async createHabit(input: unknown): Promise<Habit> {
    const parsed = habitInputSchema.parse(input);
    const db = await getDatabase();
    const now = new Date().toISOString();
    const res = await db.runAsync(
      'INSERT INTO habits (name, icon, color, is_active, created_at) VALUES (?, ?, ?, 1, ?)',
      [parsed.name, parsed.icon ?? null, parsed.color ?? null, now],
    );
    return {
      id: Number(res.lastInsertRowId),
      name: parsed.name,
      icon: parsed.icon ?? null,
      color: parsed.color ?? null,
      isActive: true,
      createdAt: now,
    };
  },

  /** Devuelve el nuevo estado del log (true = hecho) */
  async toggleHabit(habitId: number, date: string): Promise<boolean> {
    isoDay.parse(date);
    const db = await getDatabase();

    const existing = await db.getFirstAsync<{ id: number; done: number }>(
      'SELECT id, done FROM habit_logs WHERE habit_id = ? AND log_date = ?',
      [habitId, date],
    );

    if (existing) {
      const newValue = existing.done ? 0 : 1;
      await db.runAsync('UPDATE habit_logs SET done = ? WHERE id = ?', [newValue, existing.id]);
      return newValue === 1;
    }

    await db.runAsync('INSERT INTO habit_logs (habit_id, log_date, done) VALUES (?, ?, 1)', [
      habitId,
      date,
    ]);
    return true;
  },

  async getLogsByRange(habitId: number, from: string, to: string): Promise<HabitLog[]> {
    isoDay.parse(from);
    isoDay.parse(to);
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; habit_id: number; log_date: string; done: number }>(
      'SELECT * FROM habit_logs WHERE habit_id = ? AND log_date BETWEEN ? AND ? ORDER BY log_date DESC',
      [habitId, from, to],
    );
    return rows.map((r) => ({ id: r.id, habitId: r.habit_id, logDate: r.log_date, done: !!r.done }));
  },

  /** Días consecutivos con done=1 hacia atrás desde hoy (HU-10) */
  async getStreak(habitId: number): Promise<number> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ log_date: string }>(
      'SELECT log_date FROM habit_logs WHERE habit_id = ? AND done = 1 ORDER BY log_date DESC',
      [habitId],
    );
    if (rows.length === 0) return 0;

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (rows[i]?.log_date === fmt(expected)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  async isDoneToday(habitId: number, date: string): Promise<boolean> {
    isoDay.parse(date);
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ done: number }>(
      'SELECT done FROM habit_logs WHERE habit_id = ? AND log_date = ?',
      [habitId, date],
    );
    return row?.done === 1;
  },
};
