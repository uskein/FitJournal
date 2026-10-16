import { getDatabase } from '@/core/db/database';

/**
 * substitutionService — alternativas para un ejercicio.
 * Basado en mismo músculo principal, diferente equipo.
 */

export interface Substitution {
  id: number;
  name: string;
  equipment: string;
  musclePrimary: string;
}

export const substitutionService = {
  async getAlternatives(exerciseId: number, limit = 3): Promise<Substitution[]> {
    const db = await getDatabase();
    const ex = await db.getFirstAsync<{ muscle_primary: string; equipment: string }>(
      'SELECT muscle_primary, equipment FROM exercises WHERE id = ?', [exerciseId],
    );
    if (!ex) return [];

    const rows = await db.getAllAsync<{ id: number; name: string; equipment: string; muscle_primary: string }>(
      `SELECT id, name, equipment, muscle_primary FROM exercises
       WHERE muscle_primary = ? AND id != ? AND is_archived = 0
       ORDER BY CASE WHEN equipment != ? THEN 0 ELSE 1 END, name
       LIMIT ?`,
      [ex.muscle_primary, exerciseId, ex.equipment, limit],
    );
    return rows.map(r => ({ id: r.id, name: r.name, equipment: r.equipment, musclePrimary: r.muscle_primary }));
  },
};
