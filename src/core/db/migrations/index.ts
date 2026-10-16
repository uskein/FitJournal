import { migration001 } from './001_init';
import { migration002 } from './002_exercise_enrichment';

/**
 * Lista ordenada de migraciones. NUNCA editar una ya aplicada;
 * siempre añadir NNN+1.
 */
export const MIGRATIONS = [migration001, migration002];
