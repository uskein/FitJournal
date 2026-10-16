# 🔌 Contratos de Datos · FitJournal

> Al no existir backend, la "API" del proyecto son los **contratos de los repositorios** (`src/core/repositories/`). Interfaces tipadas, validación Zod en frontera y errores con códigos estilo HTTP.

---

## 1. Fundamentos

### 1.1 Entidades (resumen — ver MODELO_DE_DATOS.md para tablas)

```ts
// core/types.ts
export interface DiaryEntry {
  id: number;
  entryDate: string;        // 'YYYY-MM-DD'
  mood: 1|2|3|4|5 | null;
  energy: 1|2|3|4|5 | null;
  sleepHours: number | null;
  bodyWeight: number | null;
  weather: string | null;
  notes: string | null;
  createdAt: string;        // ISO 8601
  updatedAt: string;
}

export interface WorkoutSession {
  id: number;
  routineId: number | null;
  sessionDate: string;
  startedAt: string;
  finishedAt: string | null;
  durationMin: number | null;
  notes: string | null;
}

export interface SessionSet {
  id: number;
  sessionExerciseId: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isCompleted: boolean;
  isPr: boolean;
}
```

### 1.2 Errores tipados

```ts
// core/errors.ts
export type AppErrorCode =
  | 'VALIDATION'       // input inválido (Zod)
  | 'NOT_FOUND'        // recurso inexistente
  | 'DB_ERROR'         // error de SQLite
  | 'STORAGE_FULL'     // sin espacio en disco
  | 'PERMISSION_DENIED'// permisos de cámara/micro denegados
  | 'CONFLICT';        // estado inválido (p.ej. sesión ya finalizada)

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown,
  ) { super(message); }
}
```

### 1.3 Reglas transversales

1. Toda fecha en contratos: **string ISO** (`YYYY-MM-DD` para días, ISO 8601 completo para timestamps).
2. Toda escritura pasa por **Zod** antes de tocar la DB.
3. SQL **siempre parametrizado** (`?`); interpolación prohibida.
4. Métodos que escriben devuelven la entidad afectada o booleano; los errores se lanzan como `AppError`.

---

## 2. diaryRepository

| Método | Firma | Comportamiento |
|---|---|---|
| `getEntryByDate` | `(date: string) => Promise<DiaryEntry \| null)` | Busca por `entry_date` |
| `upsertEntry` | `(input: DiaryEntryInput, date: string) => Promise<DiaryEntry>` | Crea o actualiza la entrada del día |
| `listEntriesByRange` | `(from: string, to: string) => Promise<DiaryEntry[]>` | Para calendario/lista |
| `addMood` | `(entryId: number, mood: MoodInput) => Promise<void>` | emotion+intensity+context |
| `addGratitude` | `(entryId: number, text: string) => Promise<void>` | máx. 500 chars (CHECK) |
| `setWordOfDay` | `(entryId: number, word: string) => Promise<void>` | UPSERT |
| `setDayColor` | `(entryId: number, color: string) => Promise<void>` | color de paleta cerrada |
| `addWellnessMetric` | `(entryId: number, metric: WellnessInput) => Promise<void>` | water/meditation/steps/reading |
| `searchDiary` | `(query: string) => Promise<DiaryEntry[]>` | FTS5 sobre notas |

### Validación Zod (ejemplo)

```ts
export const diaryEntryInput = z.object({
  mood: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullish(),
  energy: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5)]).nullish(),
  sleepHours: z.number().min(0).max(24).nullish(),
  bodyWeight: z.number().positive().max(700).nullish(),
  notes: z.string().max(20000).nullish(),
});
```

---

## 3. workoutRepository

| Método | Firma | Comportamiento |
|---|---|---|
| `listRoutines` | `() => Promise<Routine[]>` | No archivadas |
| `createRoutine` | `(input: RoutineInput) => Promise<Routine>` | Crea rutina + ejercicios |
| `updateRoutine` | `(id: number, input: RoutineInput) => Promise<Routine>` | Edita (transacción) |
| `getRoutineExercises` | `(routineId: number) => Promise<RoutineExercise[]>` | Ordenadas |
| `startSession` | `(routineId: number, date: string) => Promise<WorkoutSession>` | Falla con `CONFLICT` si ya hay sesión activa |
| `completeSet` | `(sessionExerciseId: number, set: SetInput) => Promise<{ isPr: boolean }>` | **Persiste incrementalmente**; detecta PR (mejor `weight × reps` histórico del ejercicio) |
| `finishSession` | `(sessionId: number) => Promise<WorkoutSession>` | Calcula duración; dispara agregación de stats |
| `getSessionHistory` | `(exerciseId: number, limit: number) => Promise<SessionSummary[]>` | Para "última vez" en la sesión en vivo |
| `getSessionsByRange` | `(from: string, to: string) => Promise<WorkoutSession[]>` | Progreso/historial |

### Flujo de sesión en vivo (contrato implícito)

```
startSession(routineId, hoy)
  → workout_sessions + session_exercises creados
  → UI en vivo (Zustand)
completeSet(...) por cada serie  ← persistencia inmediata (resiste crash)
finishSession(sessionId)          ← duration + stats
```

---

## 4. habitRepository / goalRepository

| Método | Firma |
|---|---|
| `listActiveHabits` | `() => Promise<Habit[]>` |
| `createHabit` | `(input: HabitInput) => Promise<Habit>` |
| `toggleHabit` | `(habitId: number, date: string) => Promise<boolean>` | devuelve nuevo estado |
| `getLogsByRange` | `(habitId: number, from: string, to: string) => Promise<HabitLog[]>` |
| `getStreak` | `(habitId: number) => Promise<number>` |
| `listGoals` | `(status?: 'active'\|'done'\|'archived') => Promise<Goal[]>` |
| `updateGoalProgress` | `(goalId: number, progress: number) => Promise<void>` |

---

## 5. photoRepository + photoService

| Método | Firma | Comportamiento |
|---|---|---|
| `addPhoto` | `(owner: 'diary'\|'session', ownerId: number, uri: string) => Promise<Photo>` | `photoService` comprime (JPEG ~70%) y genera thumbnail 300px antes de guardar rutas |
| `getPhotosOfOwner` | `(owner: string, ownerId: number) => Promise<Photo[]>` | |
| `deletePhotosOfOwner` | `(owner: string, ownerId: number) => Promise<void>` | Elimina archivos + filas |
| `deletePhoto` | `(id: number) => Promise<void>` | |

---

## 6. audioRepository / sketchRepository (vía diary)

| Método | Firma |
|---|---|
| `addAudioNote` | `(entryId: number, fileUri: string, durationS: number) => Promise<AudioNote>` |
| `addSketch` | `(entryId: number, strokesJson: string) => Promise<Sketch>` |
| `getMultimediaOfEntry` | `(entryId: number) => Promise<{ photos, audios, sketches }>` |

---

## 7. exportService / importService

| Método | Firma | Detalle |
|---|---|---|
| `exportBackup` | `() => Promise<string>` | JSON (todas las tablas) + ZIP de `/files` → ruta local para compartir |
| `importBackup` | `(uri: string) => Promise<ImportResult>` | **Valida JSON completo con Zod ANTES de escribir**; import en transacción con rollback; informa de filas importadas por tabla |
| `wipeAllData` | `() => Promise<void>` | Elimina DB + archivos + settings (derecho al olvido) |

### Formato de respaldo

```json
{
  "meta": { "app": "FitJournal", "schemaVersion": 1, "exportedAt": "2026-10-15T..." },
  "tables": {
    "diary_entries": [ ... ],
    "workout_sessions": [ ... ],
    "...": []
  }
}
```

---

## 8. settingsRepository

| Método | Firma |
|---|---|
| `get` | `(key: string) => Promise<string \| null>` |
| `set` | `(key: string, value: string) => Promise<void>` |
| `getAll` | `() => Promise<Record<string,string>>` |

Claves conocidas: `theme` ('light'|'dark'|'system'), `biometric_lock` ('on'|'off'), `seed_version`, `onboarding_done`, `reminder_time`.
