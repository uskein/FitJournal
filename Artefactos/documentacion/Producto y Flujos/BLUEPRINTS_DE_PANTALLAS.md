# 📐 Blueprints de Pantallas · FitJournal

> Cada pantalla: propósito, composición visual (componentes del Design System), datos (entidades/contratos) y **4 estados obligatorios** (Loading · Empty · Success · Error).
> Showcase interactivo: `../Blueprints/BLUEPRINTS_VISUAL.html`

---

## 1. 📱 Hoy (dashboard del día)

| Eje | Detalle |
|---|---|
| **Propósito** | Ana ve su día de un vistazo: estado emocional, gym pendiente, hábitos, diario |
| **Componentes (Skill 1)** | `MoodCard`, `GymCard`, `Badge` (hábitos/streak), `Kicker`, `Button` (gym/primary), `EmptyState`, avatar |
| **Datos (Skill 2)** | `diary_entries`, `workout_sessions`, `habit_logs`, `day_colors` · `useToday()` |
| **Loading** | Skeletons clay con shimmer (cards del día) |
| **Empty** | `EmptyState` blob 📓 *"Tu cuaderno está esperando"* + CTA crear entrada |
| **Success** | Fecha + avatar · MoodCard (ánimo/energía/sueño/peso) · GymCard (▶ empezar) · hábitos con racha · acceso al diario |
| **Error** | `Toast` `DB_ERROR` + `EmptyState` con "Reintentar" y acceso a importar respaldo |

---

## 2. 📓 Diario (calendario + entradas)

| Eje | Detalle |
|---|---|
| **Propósito** | Lucía recorre su pasado: calendario con mood color, lista de entradas, búsqueda FTS |
| **Componentes** | Calendario (grid custom), `Badge`, `Kicker`, `Sheet`, `EmptyState`, `Toast` |
| **Datos** | `diary_entries`, `day_colors`, `tags` · `listEntriesByRange()`, `searchDiary()` (FTS5) |
| **Loading** | Días esqueleto con shimmer + entradas esqueleto |
| **Empty** | Mes en blanco + `EmptyState* "Octubre en blanco"* + CTA "Escribir hoy" |
| **Success** | Mes coloreado (mood = gradiente del día, gym = puntito terracota, hoy = outline) + entradas recientes |
| **Error** | `Toast` error FTS5 · calendario en modo solo lectura con opacidad |

---

## 3. 📝 Editor de entrada (día) — pantalla profunda

| Eje | Detalle |
|---|---|
| **Propósito** | Escribir el día: 3 modos, ánimo, gratitud, voz, sketch, fotos |
| **Componentes** | `ScaleSelector`, `Sheet` (plantillas), `Badge` (tags/multimedia), `Button` (icon 🎙️✍️🖼️), `Toast`, `Kicker` |
| **Datos** | `diary_entries` (upsert), `mood_entries`, `gratitude_items`, `audio_notes`, `sketches`, `photos`, `wellness_metrics` |
| **Loading** | Spinner clay *"Abriendo tu cuaderno…"* |
| **Empty** | Modo rápido + ScaleSelector + sugerencia de plantilla guiada |
| **Success** | Entrada cargada: "✓ Guardado" automático, gratitud, badges multimedia |
| **Error** | Validación Zod (`Toast` + campo marcado) · micrófono denegado (card + CTA) · `STORAGE_FULL` |

---

## 4. ⏱️ Sesión de gym en vivo — pantalla profunda

| Eje | Detalle |
|---|---|
| **Propósito** | Marcos entrena: series en un toque, RPE, descanso, historial inline, PRs |
| **Componentes** | `GymCard`, `Stepper` (mono ±2.5), `Badge` (PR 🏆), `Progress`, `Sheet` (finalizar/resumen), `BigData`, `Toast` |
| **Datos** | `workout_sessions`, `session_exercises`, `session_sets` · `completeSet()`, `getSessionHistory()`, `finishSession()` · `useSessionStore` (Zustand) |
| **Loading** | Spinner *"Preparando tu sesión…"* (crea sesión + ejercicios) |
| **Empty** | Rutina sin ejercicios → `EmptyState` + CTA a biblioteca |
| **Success** | Ejercicio activo + "Última vez" + SetRows + Stepper + Timer + PR con Badge terracota |
| **Error** | Conflicto `CONFLICT` (sesión ya activa) · fallo de escritura → serie "✗ no guardada" + Reintentar |

---

## 5. 🏋️ Entrenar (rutinas)

| Eje | Detalle |
|---|---|
| **Propósito** | Marcos gestiona rutinas y lanza sesiones; acceso a biblioteca |
| **Componentes** | `Card` (gym bar), `Button` (gym/ghost), `Kicker`, `Badge` (tags), `Sheet`, `EmptyState` |
| **Datos** | `routines`, `routine_exercises`, `exercises` · `listRoutines()`, `createRoutine()` |
| **Loading** | Skeletons de rutinas |
| **Empty** | `EmptyState* "Diseña tu primera rutina"* + CTA crear + ver biblioteca |
| **Success** | Lista de rutinas (cards con kicker + tags + ▶ Empezar) + buscador FTS |
| **Error** | `Toast` `DB_ERROR` + card de reintento (rutinas guardadas intactas) |

---

## 6. 📚 Biblioteca de ejercicios

| Eje | Detalle |
|---|---|
| **Propósito** | Buscar ejercicios precargados o crear personalizados |
| **Componentes** | Buscador (`field`), `Badge` (músculo/equipo), `EmptyState`, `Button` (＋) |
| **Datos** | `exercises` · `searchExercises()` (FTS5 sobre `exercises_fts`) |
| **Loading** | Filas esqueleto |
| **Empty** | Sin resultados → `EmptyState* "No encontramos ese ejercicio"* + CTA crear custom |
| **Success** | Lista con nombre (mono para datos), músculo, equipo |
| **Error** | `Toast` + reintento |

---

## 7. 📈 Progreso

| Eje | Detalle |
|---|---|
| **Propósito** | Ana ve su evolución: peso, volumen, rachas, correlaciones, año |
| **Componentes** | `BigData`, `Badge` (streak), `Progress`, `Card`, `Kicker`, `EmptyState`, gráficas (gifted-charts) |
| **Datos** | `session_sets`, `habit_logs`, `day_colors`, `wellness_metrics` · `statsService` |
| **Loading** | Skeletons de gráficas |
| **Empty** | `EmptyState* "Tu progreso empieza hoy"* + CTA a Hoy |
| **Success** | Gráfica de peso (mono grande) + racha 🔥 + tarjeta de correlación + CTA "Mi año" |
| **Error** | `Toast` de agregación + datos parciales marcados |

---

## 8. ⚙️ Ajustes (sheet)

| Eje | Detalle |
|---|---|
| **Propósito** | Privacidad y datos: tema, biométrico, recordatorio, export/import, borrar |
| **Componentes** | `Sheet`, switches custom, `Button` (primary/ghost), `Toast` |
| **Datos** | `settings` · `settingsRepository`, `exportService`, `importService`, `biometricService` |
| **Loading** | Spinner leyendo preferencias |
| **Empty** | Valores por defecto + CTA personalizar |
| **Success** | Privacidad (3 switches) + Tus datos (export/import/borrar) |
| **Error** | Fallo de escritura de settings → `Toast` + estado inconsistente marcado |

---

## 9. Pantallas secundarias (resumen)

| Pantalla | Componentes clave | Datos | Estados |
|---|---|---|---|
| 🚪 Onboarding | `Button`, blobs | `settings` | 3 pasos guiados |
| 📋 Rutina [id] | Stepper de orden, `Badge` | `routine_exercises` | loading/empty/success/error |
| 🔎 Ejercicio [id] | `BigData` historial | `session_sets` | idem |
| 💡 Correlaciones | Tarjetas insight + `BigData` | agregaciones | Empty si datos insuficientes |
| 🗓️ Mi año | Grid 365 días + `photos` | `day_colors` | Empty primer año |

---

## 10. Matriz de estados (obligación de QA)

| Pantalla | Loading | Empty | Success | Error |
|---|:-:|:-:|:-:|:-:|
| Hoy | ✅ | ✅ | ✅ | ✅ |
| Diario | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ | ✅ |
| Sesión en vivo | ✅ | ✅ | ✅ | ✅ |
| Entrenar | ✅ | ✅ | ✅ | ✅ |
| Biblioteca | ✅ | ✅ | ✅ | ✅ |
| Progreso | ✅ | ✅ | ✅ | ✅ |
| Ajustes | ✅ | ✅ | ✅ | ✅ |
