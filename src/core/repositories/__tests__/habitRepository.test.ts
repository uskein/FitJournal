import { habitRepository } from '../habitRepository';
import { _resetTestDatabase, openDatabaseAsync } from '@/core/db/__tests__/expo-sqlite-mock';
import { _resetDatabaseCache } from '@/core/db/database';

/**
 * Tests de habitRepository — HU-10 (hábitos con racha) · PLAN_DE_SPRINTS.md §2.9
 */

beforeEach(async () => {
  _resetDatabaseCache();
  _resetTestDatabase();
  await openDatabaseAsync();
});

/** Devuelve 'YYYY-MM-DD' con desplazamiento de días respecto a hoy */
function dayOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe('habitRepository', () => {
  test('createHabit + listActiveHabits', async () => {
    await habitRepository.createHabit({ name: 'Meditar', icon: '🧘' });
    await habitRepository.createHabit({ name: 'Agua 2L', icon: '💧' });
    const habits = await habitRepository.listActiveHabits();
    expect(habits.map((h) => h.name)).toEqual(['Meditar', 'Agua 2L']);
  });

  test('toggleHabit alterna done y devuelve el nuevo estado', async () => {
    const h = await habitRepository.createHabit({ name: 'Estirar' });
    expect(await habitRepository.toggleHabit(h.id, dayOffset(0))).toBe(true);
    expect(await habitRepository.isDoneToday(h.id, dayOffset(0))).toBe(true);
    expect(await habitRepository.toggleHabit(h.id, dayOffset(0))).toBe(false);
    expect(await habitRepository.isDoneToday(h.id, dayOffset(0))).toBe(false);
  });

  test('getStreak cuenta días consecutivos desde hoy', async () => {
    const h = await habitRepository.createHabit({ name: 'Leer' });
    // 3 días consecutivos: hoy, ayer, hace 2 días
    await habitRepository.toggleHabit(h.id, dayOffset(0));
    await habitRepository.toggleHabit(h.id, dayOffset(-1));
    await habitRepository.toggleHabit(h.id, dayOffset(-2));
    expect(await habitRepository.getStreak(h.id)).toBe(3);

    // rompe la racha: falta hace 3 días pero marca hace 4
    await habitRepository.toggleHabit(h.id, dayOffset(-4));
    expect(await habitRepository.getStreak(h.id)).toBe(3); // no cuenta el hueco
  });

  test('getStreak = 0 sin logs', async () => {
    const h = await habitRepository.createHabit({ name: 'Nuevo' });
    expect(await habitRepository.getStreak(h.id)).toBe(0);
  });

  test('Zod rechaza nombre vacío', async () => {
    await expect(habitRepository.createHabit({ name: '' })).rejects.toThrow();
  });
});
