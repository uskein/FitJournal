import type { SQLiteDatabase } from 'expo-sqlite';
import exercisesSeed from './seed/exercises.json';

/**
 * Seed del primer arranque — README_ARQUITECTURA.md §5
 * Se ejecuta una sola vez (controlado por settings['seed_version']).
 * Inserta: biblioteca de ejercicios + plantillas guiadas + prompts creativos.
 */

const SEED_VERSION = '1';

const BUILTIN_TEMPLATES: Array<{ name: string; questions: string[] }> = [
  { name: 'Morning Pages', questions: ['¿Qué siento ahora mismo?', '¿Qué quiero para hoy?', '¿Qué suelto?'] },
  { name: 'Cierre del día', questions: ['¿Cuál fue mi mejor momento?', '¿Qué aprendí hoy?', '¿Qué haría distinto?'] },
  { name: '5 gratitudes', questions: ['Por qué tres cosas buenas estoy agradecida hoy?'] },
  { name: 'Diario de sueños', questions: ['¿Qué soñé?', '¿Cómo me desperté sintiéndome?'] },
  { name: 'Desahogo', questions: ['¿Qué me está pesando? Escríbelo sin filtro.'] },
  { name: 'Reflexión gym', questions: ['¿Cómo sentí el cuerpo?', '¿Qué logré hoy en el entrenamiento?'] },
  { name: 'Una línea al día', questions: ['Resume tu día en una sola frase.'] },
];

const BUILTIN_PROMPTS: Array<{ text: string; theme: string }> = [
  { text: '¿Qué harías hoy si no tuvieras miedo?', theme: 'miedo' },
  { text: 'Describe un momento pequeño que te hizo sonreír.', theme: 'alegría' },
  { text: '¿Qué parte de ti quieres honrar hoy?', theme: 'autoconocimiento' },
  { text: 'Si tu día tuviera un color, ¿cuál sería y por qué?', theme: 'creatividad' },
  { text: '¿Qué estás dejando ir en esta etapa de tu vida?', theme: 'soltar' },
  { text: 'Escribe una carta de agradecimiento a tu cuerpo.', theme: 'gratitud' },
];

export async function runSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'seed_version'",
  );
  if (row?.value === SEED_VERSION) return;

  await db.withTransactionAsync(async () => {
    const now = new Date().toISOString();

    for (const ex of exercisesSeed) {
      await db.runAsync(
        `INSERT INTO exercises (name, muscle_primary, muscle_secondary, equipment, type, instructions, is_custom)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [ex.name, ex.muscle_primary, ex.muscle_secondary, ex.equipment, ex.type, ex.instructions],
      );
    }

    for (const t of BUILTIN_TEMPLATES) {
      await db.runAsync(
        `INSERT INTO journal_templates (name, questions, is_builtin, created_at) VALUES (?, ?, 1, ?)`,
        [t.name, JSON.stringify(t.questions), now],
      );
    }

    for (const p of BUILTIN_PROMPTS) {
      await db.runAsync(`INSERT INTO journal_prompts (text, theme) VALUES (?, ?)`, [p.text, p.theme]);
    }

    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES ('seed_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [SEED_VERSION],
    );
  });
}
