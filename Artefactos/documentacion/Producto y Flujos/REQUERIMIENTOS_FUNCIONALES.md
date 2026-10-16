# 📋 Requerimientos Funcionales · FitJournal

> **Proyecto:** FitJournal — Bitácora de vida + gimnasio (local-first, SQLite)
> **Identidad:** «Warm Clay Editorial» · **Arquitectura:** Expo + expo-sqlite (ver referencias del proyecto)
> **Versión:** 1.0 · Aprobado

---

## 1. Actores (Personas)

> FitJournal **no tiene roles de administrador**: en una app local-first el usuario es dueño absoluto de sus datos.

| Persona | Perfil | Objetivos | Frustraciones | Expertise |
|---|---|---|---|---|
| 🧘‍♀️ **Lucía — "La que busca calma"** (24) | Quiere empezar journaling; medita; privacidad por encima de todo | Espacio íntimo, guía para escribir, ver evolución emocional | Diarios que abandona por no saber qué escribir; apps que piden cuenta | Bajo en gym · medio en apps |
| 🏋️‍♂️ **Marcos — "El de los números"** (35) | Entrena 4-5/semana (fuerza); obsesionado con PRs y volumen | Registrar series en un toque, ver historial inline, PRs automáticos | Apps lentas para anotar series; historiales sin comparativas | Alto en gym · alto en apps |
| 🌱 **Ana — "La que vuelve"** (28) | Volvió al gym tras 2 años sedentaria; busca constancia | Rachas, hábitos, progreso en salud (sueño, ánimo) | Apps que solo miden estética; perder motivación a las 2 semanas | Medio en ambas |

---

## 2. Épicas

| # | Épica | Historias | Persona principal |
|---|---|---|---|
| **E1** | **Diario creativo** — entrada por día, mood, gratitud, plantillas guiadas, voz, sketch, fotos, métricas, word of day | HU-01, 05, 06, 09, 14, 15 | Lucía |
| **E2** | **Gimnasio** — biblioteca de ejercicios, rutinas, sesión en vivo, PRs, historial | HU-02, 03, 04, 13 | Marcos |
| **E3** | **El Día unificado** — vista "Hoy" que conecta diario + gym + hábitos | HU-07, 10 | Ana |
| **E4** | **Progreso** — gráficas, rachas, mood map anual, correlaciones | HU-08, 11 | Ana / Lucía |
| **E5** | **Confianza** — export/import, bloqueo biométrico, recordatorios, tema | HU-12, 16 | Lucía |

---

## 3. Historias de Usuario y Criterios de Aceptación

### E1 — Diario creativo

**HU-01 · Registro del día en menos de 30 segundos**
> Como **usuario**, quiero registrar cómo amanecí (ánimo, energía, sueño) en pocos toques para **mantener el hábito sin fricción**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Abro la tab "Hoy" sin entrada | El día está vacío | Veo **ScaleSelector** (5 botones circulares) para ánimo y energía |
| CA2 | Selecciono ánimo 4 | El sistema guarda | Upsert en `diary_entries` (`entry_date`=hoy); el botón se **infla con spring** |
| CA3 | Ya registré hoy | Vuelvo a "Hoy" | Valores precargados (edición, no duplicado) |
| CA4 | Sueño = 30 (fuera de 0-24) | Intento guardar | Zod rechaza + **Toast** error `#C0504D` |

**HU-05 · Gratitud diaria**
> Como **usuario**, quiero apuntar 3 cosas buenas del día para **entrenar mi atención a lo positivo**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | En la entrada del día | Añado texto de gratitud | Guarda en `gratitude_items` (máx. 500 chars, límite 5/día) |
| CA2 | Tengo 5 gratitudes | Intento añadir otra | Bloqueo cálido: *"El día ya está lleno de cosas buenas"* |

**HU-06 · Mood color map**
> Como **usuario**, quiero que mi mes se vea en colores para **sentir mi vida de un vistazo**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Tab Diario | Veo el calendario | Cada día con entrada muestra su `day_colors` |
| CA2 | Mes completo | — | Mosaico de colores coherente con la paleta cerrada del manual |

**HU-09 · Notas de voz**
> Como **usuario**, quiero grabar una nota de voz cuando no tengo tiempo de escribir para **no perder lo que siento**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | En la entrada | Mantengo 🎙️ | Graba (expo-av) con indicador de tiempo |
| CA2 | Suelto | Se guarda | Archivo en filesystem + fila `audio_notes` |
| CA3 | Micro denegado | Intento grabar | Card explicativa + CTA "Abrir ajustes" (`PERMISSION_DENIED`) |

**HU-14 · Plantillas guiadas**
> Como **Lucía**, quiero plantillas de preguntas para **no bloquearme frente a la página en blanco**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Editor vacío | Elijo «Cierre del día» | Aparecen las preguntas de `journal_templates` como secciones |
| CA2 | Respondo y guardo | — | Respuestas en `notes` con formato estructurado |

**HU-15 · Sketch a mano**
> Como **usuario**, quiero dibujar un ejercicio o una idea para **expresarme sin palabras**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | En la entrada | Toco ✍️ | Lienzo con trazos (Gesture Handler + SVG) |
| CA2 | Dibujo y salvo | — | Trazos serializados a JSON en `sketches.strokes` |

### E2 — Gimnasio

**HU-02 · Registrar una serie en un toque**
> Como **Marcos**, quiero registrar peso y reps de cada serie en un toque durante el entreno para **no interrumpir el ritmo**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Sesión en vivo | Completo una serie | `completeSet()` persiste **inmediatamente** (resiste crash) |
| CA2 | Misma serie | Edito el peso | **Stepper** ±2.5 kg (valor en JetBrains Mono) |
| CA3 | Serie marcada | — | Check verde con spring; fila se atenúa |

**HU-03 · Ver "última vez" mientras entreno**
> Como **Marcos**, quiero ver qué hice la última vez con ese ejercicio para **saber a qué peso aspirar**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Ejercicio activo | — | Línea superior: *"Última: 8 oct — 80kg × 5,5,5,4"* (`getSessionHistory`) |

**HU-04 · Detección automática de PRs**
> Como **Marcos**, quiero que la app detecte mis PRs para **celebrarlos sin calcular nada**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Completo una serie | `weight × reps` supera el histórico | `is_pr=1` + **Badge** terracota 🏆 + animación |

**HU-13 · Biblioteca y rutinas**
> Como **usuario**, quiero crear rutinas con ejercicios (propios o de la biblioteca) para **tener un plan**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Nueva rutina | Añado ejercicio | `routines` + `routine_exercises` (orden, targets, descanso) |
| CA2 | Busco "sentadilla" | — | **FTS5** sobre `exercises_fts` |

### E3 — El Día unificado

**HU-07 · Vista "Hoy" completa**
> Como **Ana**, quiero ver mi día entero (estado, gym, hábitos, diario) en una pantalla para **saber qué me espera**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Abro "Hoy" | — | **MoodCard** + **GymCard** + hábitos + acceso al diario |
| CA2 | Primera vez | Día sin datos | **EmptyState** blob: *"Tu cuaderno está esperando"* |

**HU-10 · Hábitos con racha**
> Como **Ana**, quiero marcar mis hábitos y ver mi racha para **no perder la constancia**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Tab Hoy | Marco hábito | `toggleHabit()` + **Badge** ámbar 🔥 (`getStreak`) |

### E4 — Progreso

**HU-08 · Correlaciones y mood map**
> Como **usuario**, quiero ver cómo se conectan descanso, ánimo y rendimiento para **conocerme mejor**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Tab Progreso | — | Gráfica de peso (gifted-charts), volumen, rachas |
| CA2 | Datos suficientes | — | Correlaciones: *"dormiste >7h → RPE bajó 1.2"* |
| CA3 | — | Abro "Mi año" | **Mood color map** con `day_colors` |

**HU-11 · Insignias y logros**
> Como **Ana**, quiero insignias por mis rachas para **sentir que avanzo**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Cumplí 7 días seguidos | Veo Progreso | **Badge** ámbar 🔥 con número en mono |

### E5 — Confianza

**HU-12 · Bloqueo biométrico y recordatorios**
> Como **Lucía**, quiero bloquear la app con huella y recibir un recordatorio amable para **proteger mi intimidad y no olvidarme**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Activo bloqueo | Abro la app | `expo-local-authentication` antes de ver datos |
| CA2 | Recordatorio 21:00 | Llega la hora | Notificación local: *"¿Cómo amaneciste?"* (sin red) |

**HU-16 · Exportar e importar respaldo**
> Como **usuario**, quiero exportar todo mi contenido a un archivo para **poseer mis datos y cambiar de móvil**.

| # | Given | When | Then |
|---|---|---|---|
| CA1 | Ajustes | Exportar | JSON (todas las tablas) + ZIP de medios (`exportBackup()`) |
| CA2 | Archivo válido | Importar | Validación Zod completa + transacción con rollback |

---

## 4. Reglas de negocio inquebrantables

1. **Una entrada de diario por día** (`UNIQUE(entry_date)` — UPSERT).
2. **Persistencia incremental** en la sesión de gym: cada serie se escribe al completarse.
3. **La app no realiza llamadas de red** — sin excepciones en v1.
4. Todo dato del usuario vive en **SQLite + filesystem del dispositivo** y es **exportable**.
5. Máx. **5 gratitudes/día**, **500 chars** por gratitud.
6. **PR** = `weight × reps` máximo histórico del mismo ejercicio.
7. La terracota **solo** aparece en contexto de gimnasio (identidad visual).
8. "Borrar todos los datos" elimina DB + archivos + settings (derecho al olvido).
