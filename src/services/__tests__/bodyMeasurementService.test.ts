import { bodyMeasurementService } from '../bodyMeasurementService';
import { photoRepository } from '@/core/repositories/photoRepository';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache } from '@/core/db/database';

/**
 * Tests de bodyMeasurementService — medidas corporales (Migración 006: fotos 'body').
 * Esquema REAL sobre better-sqlite3 en memoria (mismo harness que diaryRepository).
 */

beforeEach(async () => {
  _resetDatabaseCache();
  _resetTestDatabase();
  await openDatabaseAsync();
});

describe('bodyMeasurementService', () => {
  test('record crea la medición y devuelve el id', async () => {
    const id = await bodyMeasurementService.record('2026-10-01', { weight: 70.5, waist: 80 });
    expect(id).toBeGreaterThan(0);

    const list = await bodyMeasurementService.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.weight).toBe(70.5);
    expect(list[0]?.waist).toBe(80);
  });

  test('record es upsert por fecha: mismo día ⇒ mismo id, sin duplicados y COALESCE conserva', async () => {
    const id1 = await bodyMeasurementService.record('2026-10-01', { weight: 70, waist: 82 });
    const id2 = await bodyMeasurementService.record('2026-10-01', { chest: 100 });
    expect(id2).toBe(id1);

    const list = await bodyMeasurementService.list();
    expect(list).toHaveLength(1); // nunca duplica un mismo día
    expect(list[0]?.weight).toBe(70);  // valor previo conservado (COALESCE)
    expect(list[0]?.chest).toBe(100);  // valor nuevo añadido
  });

  test('Zod rechaza peso fuera de rango', async () => {
    await expect(
      bodyMeasurementService.record('2026-10-01', { weight: 500 }),
    ).rejects.toThrow();
  });

  test('remove borra la medición y sus fotos de progreso (filas)', async () => {
    const id = await bodyMeasurementService.record('2026-10-01', { weight: 70 });
    await photoRepository.addPhoto('body', id, { filePath: '/tmp/progreso.jpg', thumbPath: '/tmp/progreso_t.jpg' });
    expect(await photoRepository.getPhotosOfOwner('body', id)).toHaveLength(1);

    await bodyMeasurementService.remove(id);

    expect(await bodyMeasurementService.list()).toHaveLength(0);
    expect(await photoRepository.getPhotosOfOwner('body', id)).toHaveLength(0);
  });

  test('el owner "body" es válido tras la migración 006 (CHECK ampliado)', async () => {
    const p = await photoRepository.addPhoto('body', 99, { filePath: '/tmp/x.jpg' });
    expect(p.ownerType).toBe('body');
    await expect(
      photoRepository.addPhoto('otro' as never, 1, { filePath: '/tmp/y.jpg' }),
    ).rejects.toThrow();
  });
});
