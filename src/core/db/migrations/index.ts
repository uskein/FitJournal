import { migration001 } from './001_init';
import { migration002 } from './002_exercise_enrichment';
import { migration003 } from './003_body_measurements';

/**
 * Lista ordenada de migraciones. NUNCA editar una ya aplicada;
 * siempre añadir NNN+1.
 */
export const MIGRATIONS = [migration001, migration002, migration003];
