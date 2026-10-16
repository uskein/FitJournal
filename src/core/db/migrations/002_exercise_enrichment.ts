/**
 * Migración 002 — Campos enriquecidos de ejercicios
 * Añade: imagen, video, url_video, nivel habilidad, nivel esfuerzo,
 * zonas musculares, beneficios de salud.
 */

const SQL_002 = `
ALTER TABLE exercises ADD COLUMN image_path TEXT;
ALTER TABLE exercises ADD COLUMN video_path TEXT;
ALTER TABLE exercises ADD COLUMN video_url TEXT;
ALTER TABLE exercises ADD COLUMN skill_level INTEGER CHECK(skill_level BETWEEN 1 AND 5);
ALTER TABLE exercises ADD COLUMN effort_level INTEGER CHECK(effort_level BETWEEN 1 AND 5);
ALTER TABLE exercises ADD COLUMN muscle_zones TEXT;
ALTER TABLE exercises ADD COLUMN health_benefits TEXT;
`;

export const migration002 = {
  version: 2,
  name: '002_exercise_enrichment',
  sql: SQL_002,
} as const;
