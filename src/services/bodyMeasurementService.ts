import { getDatabase } from '@/core/db/database';
import { photoService } from '@/services/photoService';
import { z } from 'zod';

/**
 * bodyMeasurementService — medidas corporales históricas.
 * Cada registro: fecha + peso + medidas en cm. Permite gráficas de evolución.
 * `record` hace upsert por fecha (nunca duplica un mismo día).
 */

export interface BodyMeasurement {
  id: number;
  date: string;
  weight: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  armLeft: number | null;
  armRight: number | null;
  thighLeft: number | null;
  thighRight: number | null;
  neck: number | null;
  notes: string | null;
}

const measurementSchema = z.object({
  weight: z.number().positive().max(400).nullish(),
  chest: z.number().positive().max(200).nullish(),
  waist: z.number().positive().max(200).nullish(),
  hips: z.number().positive().max(200).nullish(),
  armLeft: z.number().positive().max(80).nullish(),
  armRight: z.number().positive().max(80).nullish(),
  thighLeft: z.number().positive().max(120).nullish(),
  thighRight: z.number().positive().max(120).nullish(),
  neck: z.number().positive().max(60).nullish(),
  notes: z.string().max(1000).nullish(),
});

export const bodyMeasurementService = {
  /** Guarda la medición de `date` (upsert: mismo día ⇒ misma fila, COALESCE conserva lo ya escrito). Devuelve el id. */
  async record(date: string, input: unknown): Promise<number> {
    const p = measurementSchema.parse(input);
    const db = await getDatabase();
    const params = [
      p.weight ?? null, p.chest ?? null, p.waist ?? null, p.hips ?? null,
      p.armLeft ?? null, p.armRight ?? null, p.thighLeft ?? null, p.thighRight ?? null,
      p.neck ?? null, p.notes ?? null,
    ];

    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM body_measurements WHERE date = ?', [date],
    );
    if (existing) {
      await db.runAsync(
        `UPDATE body_measurements
            SET weight = COALESCE(?, weight),  chest = COALESCE(?, chest),
                waist = COALESCE(?, waist),    hips = COALESCE(?, hips),
                arm_left = COALESCE(?, arm_left),     arm_right = COALESCE(?, arm_right),
                thigh_left = COALESCE(?, thigh_left), thigh_right = COALESCE(?, thigh_right),
                neck = COALESCE(?, neck),       notes = COALESCE(?, notes)
          WHERE id = ?`,
        [...params, existing.id],
      );
      return existing.id;
    }

    const res = await db.runAsync(
      `INSERT INTO body_measurements (date, weight, chest, waist, hips, arm_left, arm_right, thigh_left, thigh_right, neck, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, ...params],
    );
    return Number(res.lastInsertRowId);
  },

  /** Borra la medición y sus fotos de progreso (archivos + filas) */
  async remove(id: number): Promise<void> {
    const photos = await photoService.listPhotos('body', id);
    for (const p of photos) {
      await photoService.deletePhoto(p.id);
    }
    const db = await getDatabase();
    await db.runAsync('DELETE FROM body_measurements WHERE id = ?', [id]);
  },

  async list(limit = 30): Promise<BodyMeasurement[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: number; date: string; weight: number | null; chest: number | null; waist: number | null;
      hips: number | null; arm_left: number | null; arm_right: number | null;
      thigh_left: number | null; thigh_right: number | null; neck: number | null; notes: string | null;
    }>('SELECT * FROM body_measurements ORDER BY date DESC, id DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id, date: r.date, weight: r.weight, chest: r.chest, waist: r.waist, hips: r.hips,
      armLeft: r.arm_left, armRight: r.arm_right, thighLeft: r.thigh_left, thighRight: r.thigh_right,
      neck: r.neck, notes: r.notes,
    }));
  },

  async latest(): Promise<BodyMeasurement | null> {
    const list = await this.list(1);
    return list[0] ?? null;
  },
};
