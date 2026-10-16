# 🗓️ Plan de Sprints · FitJournal

> Generado por el Orquestador (Skill 4 · Paso 1). Trazable a: REQUERIMIENTOS_FUNCIONALES.md, BLUEPRINTS_DE_PANTALLAS.md, ESTRUCTURA_DIRECTORIOS.md, MODELO_DE_DATOS.md, manual-identidad-visual.md.

---

## Mapa de dependencias

```
Sprint 0 Cimientos ─┬─→ Sprint 1 Design System ─┬─→ Sprint 3 Hoy ─→ Sprint 4 Diario ─→ Sprint 5 Multimedia
                    └─→ Sprint 2 Núcleo de datos ─┘                      │
                                        Sprint 6 Gimnasio ←──────────────┤
                                        Sprint 7 Progreso ←──────────────┘
                                        Sprint 8 Confianza + pulido ← (todos)
```

---

## Sprint 0 — Cimientos ✅ COMPLETADO · Complejidad: Alta

| # | Tarea | Detalle | Cmpl. |
|---|---|---|---|
| 0.1 | Scaffold Expo + TS | `create-expo-app` + TypeScript strict + expo-router | Media |
| 0.2 | Dependencias | reanimated, gesture-handler, expo-sqlite, zustand, zod, linear-gradient, svg, image-picker, image-manipulator, av, blur, fonts (fraunces/nunito-sans/jetbrains-mono), local-authentication, notifications, file-system, gifted-charts | Baja |
| 0.3 | Estructura de carpetas | Árbol completo de ESTRUCTURA_DIRECTORIOS.md | Baja |
| 0.4 | Design tokens | `src/theme/tokens.ts`, `typography.ts`, `ThemeProvider.tsx` (claro/oscuro) según manual-identidad-visual.md | Media |
| 0.5 | Núcleo DB | `database.ts` (pragmas WAL/FK), `migrator.ts` (user_version) | Media |
| 0.6 | Migración 001 | `001_init.sql`: 22 tablas + índices + FTS5 + triggers (MODELO_DE_DATOS.md) | Alta |
| 0.7 | Seed | `exercises.json` (~100 ejercicios) + inserción en 1er arranque | Media |
| 0.8 | Calidad base | eslint, prettier, jest config, `tsconfig strict` | Baja |
| 0.9 | Validación | `tsc --noEmit` ✓ · `expo start` arranca ✓ · DB abre y migra ✓ | Baja |

**Criterio de hecho:** app arranca, DB creada con esquema completo y seed cargado.

---

## Sprint 1 — Design System ✅ COMPLETADO · Complejidad: Media

| # | Tarea | Componente (Skill 1) | Cmpl. |
|---|---|---|---|
| 1.1 | Button | primary/gym/ghost/icon · sombra clay + spring · 5 estados | Media |
| 1.2 | Card | elevada con sombra clay obligatoria | Baja |
| 1.3 | MoodCard | gradiente mood + barra 6px | Baja |
| 1.4 | GymCard | barra terracota + kicker | Baja |
| 1.5 | Kicker | UPPER + tracking .18em | Baja |
| 1.6 | BigData | JetBrains Mono gigante | Baja |
| 1.7 | Badge | habit/pr/streak/tag | Baja |
| 1.8 | ScaleSelector | 5 botones circulares + spring (componente insignia) | Media |
| 1.9 | Stepper | ± con valor mono | Baja |
| 1.10 | Progress | gradiente salvia→ámbar | Baja |
| 1.11 | Toast | spring + borde de estado | Baja |
| 1.12 | Sheet | modal inferior clay | Media |
| 1.13 | EmptyState | blob morphing + Fraunces + CTA | Media |
| 1.14 | Validación | tsc ✓ · reduced-motion ✓ · contraste AA ✓ | Baja |

**Criterio de hecho:** 13 componentes + theme funcionando; aprobación del usuario (hito).

---

## Sprint 2 — Núcleo de Datos ✅ COMPLETADO (tests: 23/23 ✓) · Complejidad: Alta

| # | Tarea | Contrato (Skill 2) | Cmpl. |
|---|---|---|---|
| 2.1 | types.ts + errors.ts | Entidades + AppError | Media |
| 2.2 | Zod schemas | diarySchemas, workoutSchemas | Media |
| 2.3 | diaryRepository | getEntryByDate, upsertEntry, listRange, addMood, addGratitude, wordOfDay, dayColor, metrics, searchDiary (FTS) | Alta |
| 2.4 | workoutRepository | routines CRUD, startSession, completeSet (+detección PR), finishSession, getSessionHistory | Alta |
| 2.5 | habitRepository + goalRepository | toggle, logs, getStreak; metas | Media |
| 2.6 | photoRepository | addPhoto, getByOwner, deleteWithOwner | Media |
| 2.7 | settingsRepository | get/set/getAll | Baja |
| 2.8 | services | photo (compresión), audio, export (JSON+ZIP), import (Zod+rollback), notification, biometric | Alta |
| 2.9 | Tests repositorios | Jest + DB en memoria: CRUD, cascadas, PR, streak, FTS | Alta |
| 2.10 | Validación | tests en verde ✓ · `tsc` ✓ | Baja |

**Criterio de hecho:** toda la capa de datos con tests verdes.

---

## Sprint 3 — Onboarding + Tab Hoy ✅ COMPLETADO · Complejidad: Media

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 3.1 | Navegación tabs (4) + stacks | ARQUITECTURA_INFORMACION.md | Media |
| 3.2 | Onboarding 3 pasos | settings['onboarding_done'] | Baja |
| 3.3 | Pantalla Hoy (4 estados) | BLUEPRINTS: skeletons/empty/success/error | Alta |
| 3.4 | Hábitos: toggle + racha + badge | HU-10 | Media |
| 3.5 | `useToday` hook | agrega diary+gym+hábitos | Media |
| 3.6 | Ajustes sheet (mínimo) | tema + recordatorio | Baja |

---

## Sprint 4 — Diario (E1) ✅ COMPLETADO · Complejidad: Alta

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 4.1 | Calendario mensual (mood colors + gym) | HU-06, blueprint Diario | Alta |
| 4.2 | Lista de entradas + mood map | HU-06 | Media |
| 4.3 | Editor: 3 modos + auto-guardado | HU-01, blueprint Editor | Alta |
| 4.4 | ScaleSelector de ánimo/energía | HU-01 | Baja |
| 4.5 | Gratitud (máx 5) | HU-05 | Baja |
| 4.6 | Métricas bienestar + peso/sueño | HU-01 | Media |
| 4.7 | Palabra + color del día | HU-06 | Baja |
| 4.8 | Etiquetas #tags | REQUERIMIENTOS | Media |
| 4.9 | Búsqueda FTS5 | HU-06 | Media |

---

## Sprint 5 — Multimedia Creativa ✅ COMPLETADO · Complejidad: Alta

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 5.1 | Fotos: picker + compresión 70% + thumbs | HU-16/blueprints | Alta |
| 5.2 | Galería por entrada (diario/sesión) | photos.owner | Media |
| 5.3 | Notas de voz (expo-av) + permisos | HU-09 + borde B2 | Alta |
| 5.4 | Sketch: gestos + SVG + JSON | HU-15 | Alta |
| 5.5 | Plantillas guiadas + prompts | HU-14 | Media |

---

## Sprint 6 — Gimnasio (E2) ✅ COMPLETADO · Complejidad: Alta

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 6.1 | Biblioteca FTS + detalle ejercicio | HU-13 | Media |
| 6.2 | Ejercicio personalizado | HU-13 | Baja |
| 6.3 | Rutinas CRUD + edición | HU-13 | Alta |
| 6.4 | Sesión en vivo: SetRows + Stepper | HU-02, blueprint Sesión | Alta |
| 6.5 | Persistencia incremental + restauración | regla negocio 2 | Alta |
| 6.6 | Historial "última vez" inline | HU-03 | Media |
| 6.7 | Detección de PRs + Badge/Toast | HU-04 | Media |
| 6.8 | Timer descanso | blueprint | Media |
| 6.9 | Finalizar + Sheet resumen | flujo F2 | Media |

---

## Sprint 7 — Progreso (E4) ✅ COMPLETADO · Complejidad: Media

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 7.1 | Gráfica peso por ejercicio (gifted-charts) | HU-08 | Media |
| 7.2 | Volumen semanal + frecuencia | HU-08 | Media |
| 7.3 | Rachas + insignias | HU-11 | Media |
| 7.4 | Tarjetas de correlación | HU-08 (diferencial) | Alta |
| 7.5 | "Mi año": mood map anual | HU-06/08 | Media |

---

## Sprint 8 — Confianza y Pulido (E5) ✅ COMPLETADO · Complejidad: Media

| # | Tarea | Fuente | Cmpl. |
|---|---|---|---|
| 8.1 | Exportar respaldo (JSON+ZIP) | HU-16, flujo F4 | Media |
| 8.2 | Importar respaldo (Zod+rollback) | HU-16, borde B9 | Alta |
| 8.3 | Borrar todos los datos | regla negocio 8 | Media |
| 8.4 | Bloqueo biométrico | HU-12 | Baja |
| 8.5 | Recordatorios locales | HU-12, borde B10 | Baja |
| 8.6 | Tema oscuro completo | manual Skill 1 | Media |
| 8.7 | Accesibilidad WCAG AA + reduced-motion | manual Skill 1 | Media |
| 8.8 | Performance (listas, imágenes) | presupuesto Paso 1 Skill 2 | Media |
| 8.9 | README de desarrollo | Orquestador Paso 9 | Baja |

---

## Resumen de carga

| Sprint | Tareas | Complejidad dominante |
|---|---|---|
| 0 Cimientos | 9 | Alta |
| 1 Design System | 14 | Media |
| 2 Núcleo datos | 10 | Alta |
| 3 Hoy + Onboarding | 6 | Media |
| 4 Diario | 9 | Alta |
| 5 Multimedia | 5 | Alta |
| 6 Gimnasio | 9 | Alta |
| 7 Progreso | 5 | Media |
| 8 Confianza | 9 | Media |
| **Total** | **76 tareas** | — |

## Hitos de aprobación del orquestador

- ✅ Fin Sprint 1 → Design System (hito Paso 3)
- ✅ Fin Sprint 4+6 → Flujos de usuario (hito Paso 5)
- ✅ Fin Sprint 8 → Despliegue/entrega (hito Paso 10)

## Definición de "hecho" global

1. `tsc --noEmit` sin errores · lint en verde · tests en verde.
2. Los 4 estados de cada pantalla implementados (matriz en BLUEPRINTS_DE_PANTALLAS.md §10).
3. Solo componentes/colores del manual visual (trazabilidad Skill 1).
4. Solo contratos de CONTRATOS_API.md (trazabilidad Skill 2).
5. Flujos F1-F4 y casos borde B1-B10 funcionales.
