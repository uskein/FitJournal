# 📁 Estructura de Directorios · FitJournal

> Organización **feature-first** con núcleo compartido. Regla: las pantallas nunca tocan SQL; los datos pasan siempre por repositorios.

---

## Árbol del repositorio

```
fitjournal/
├── app/                              # PANTALLAS — expo-router (file-based)
│   ├── _layout.tsx                   # Root: carga fuentes, ThemeProvider, apertura DB + migraciones
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Bottom tabs clay: Hoy · Diario · Entrenar · Progreso
│   │   ├── hoy.tsx                   # Dashboard del día: estado (mood/sueño), gym, hábitos, diario
│   │   ├── diario.tsx                # Calendario mensual + lista de entradas + mood color map
│   │   ├── entrenar.tsx              # Rutinas guardadas + historial de sesiones
│   │   └── progreso.tsx              # Gráficas, PRs, rachas, correlaciones
│   ├── entrada/[date].tsx            # Editor del día: texto, ánimo, gratitud, voz, sketch, fotos
│   ├── sesion/[id].tsx               # Sesión de gym EN VIVO: series, RPE, descanso, PRs, fotos
│   ├── rutina/[id].tsx               # Detalle/edición de rutina (ejercicios, orden, targets)
│   ├── ejercicio/[id].tsx            # Detalle de ejercicio + historial de series
│   └── ajustes.tsx                   # Tema, bloqueo biométrico, export/import, ejercicios custom
│
├── src/
│   ├── core/                         # NÚCLEO feature-agnóstico
│   │   ├── db/
│   │   │   ├── database.ts           # openDatabase + pragmas (WAL, foreign_keys, synchronous)
│   │   │   ├── migrator.ts           # aplica migraciones pendientes por PRAGMA user_version
│   │   │   ├── migrations/
│   │   │   │   ├── 001_init.sql      # esquema completo + índices + FTS5
│   │   │   │   └── 002_*.sql         # futuras (nunca editar aplicadas)
│   │   │   └── seed/
│   │   │       └── exercises.json    # biblioteca inicial de ejercicios (cargada en 1er arranque)
│   │   ├── repositories/             # ÚNICA puerta a los datos
│   │   │   ├── diaryRepository.ts    # entradas, mood, gratitud, métricas, búsqueda FTS
│   │   │   ├── workoutRepository.ts  # rutinas, sesiones, series, PRs, historial
│   │   │   ├── habitRepository.ts    # hábitos, logs, rachas
│   │   │   ├── goalRepository.ts     # metas y su progreso
│   │   │   ├── photoRepository.ts    # fotos por dueño (diary|session), thumbnails
│   │   │   └── settingsRepository.ts # preferencias clave-valor en SQLite
│   │   ├── validation/               # Schemas Zod (frontera de datos)
│   │   │   ├── diarySchemas.ts
│   │   │   └── workoutSchemas.ts
│   │   ├── errors.ts                 # AppError tipado: VALIDATION | NOT_FOUND | DB_ERROR | STORAGE_FULL | PERMISSION_DENIED
│   │   └── types.ts                  # Entidades: DiaryEntry, WorkoutSession, SessionSet, Habit, Photo...
│   │
│   ├── features/                     # UNA CARPETA POR FEATURE (autocontenida)
│   │   ├── hoy/
│   │   │   ├── components/           # DayStateCard, GymSummaryCard, HabitsRow, QuickJournal
│   │   │   └── hooks/useToday.ts     # agrega el día completo (diary + sesión + hábitos)
│   │   ├── diario/
│   │   │   ├── components/           # MoodScale, GratitudeList, VoiceNoteButton, SketchPad, MoodColorMap
│   │   │   └── hooks/useEntry.ts     # entrada del día, guardado optimista
│   │   ├── entrenar/
│   │   │   ├── components/           # ExerciseCard, SetRow, RestTimer, HistoryPeek, StepperPeso
│   │   │   └── hooks/useLiveSession.ts # orquesta Zustand + repositorio
│   │   ├── progreso/
│   │   │   ├── components/           # WeightChart, VolumeChart, StreakBadge, CorrelationCard, YearMap
│   │   │   └── hooks/useStats.ts
│   │   └── ajustes/
│   │
│   ├── services/                     # Servicios de dispositivo transversales
│   │   ├── photoService.ts           # picker + compresión JPEG~70% + thumbnail 300px
│   │   ├── audioService.ts           # grabación y playback de notas de voz (expo-av)
│   │   ├── exportService.ts          # respaldo JSON + ZIP de /files
│   │   ├── importService.ts          # restauración con validación Zod + transacción con rollback
│   │   ├── notificationService.ts    # recordatorios locales ("¿Cómo amaneciste?")
│   │   └── biometricService.ts       # bloqueo biométrico (Face ID / huella)
│   │
│   ├── state/                        # Zustand
│   │   ├── useSessionStore.ts        # workout EN VIVO (ejercicio actual, series pendientes, timer)
│   │   ├── useThemeStore.ts          # claro / oscuro
│   │   └── useOnboardingStore.ts     # primer arranque
│   │
│   ├── theme/                        # MATERIALIZACIÓN de la SSoT visual
│   │   ├── tokens.ts                 # colores, spacing, radius, shadows (del manual)
│   │   ├── typography.ts             # fraunces / nunito-sans / jetbrains-mono + escalas
│   │   └── ThemeProvider.tsx         # contexto claro/oscuro
│   │
│   ├── ui/                           # DESIGN SYSTEM clay — componentes base reutilizables
│   │   ├── Button.tsx                # primary | gym | ghost | icon (sombra clay + spring)
│   │   ├── Card.tsx                  # superficie elevada (sombra clay obligatoria)
│   │   ├── MoodCard.tsx              # gradiente del mood + barra de color 6px
│   │   ├── GymCard.tsx               # barra terracota + BigData mono
│   │   ├── Kicker.tsx                # label editorial (UPPERCASE + tracking .18em)
│   │   ├── BigData.tsx               # número JetBrains Mono gigante (PRs, récords)
│   │   ├── Badge.tsx                 # habit | pr | streak | tag
│   │   ├── ScaleSelector.tsx         # escala táctil ánimo/energía/RPE (componente insignia)
│   │   ├── Stepper.tsx               # ± con valor mono
│   │   ├── Progress.tsx              # gradiente salvia→ámbar
│   │   ├── Toast.tsx
│   │   ├── Sheet.tsx                 # modal inferior (radio 24, backdrop)
│   │   └── EmptyState.tsx            # blob morphing + Fraunces + CTA
│   │
│   └── utils/                        # utilidades puras
│       ├── dates.ts                  # 'YYYY-MM-DD', rangos, "hoy"
│       └── format.ts                 # kg × reps, duraciones, porcentajes
│
├── assets/                           # iconos, splash, blobs SVG
├── __tests__/                        # Jest: tests de repositorios (DB en memoria) y componentes
├── app.config.ts                     # Expo: plugins, permisos (cámara/fotos), versiones
├── package.json
├── tsconfig.json                     # strict: true
├── eslint.config.js
└── opencode.json                     # references: identidad-visual + arquitectura
```

---

## Reglas de responsabilidad

| Carpeta | Puede | No puede |
|---|---|---|
| `app/` | Navegar, componer pantallas con `ui/` y `features/` | Ejecutar SQL, importar repositorios directamente con lógica compleja |
| `core/repositories/` | Acceder a `database.ts`, validar con Zod, devolver entidades | Contocer lógica de UI o estado de pantalla |
| `features/*` | Usar repositorios vía hooks, tener componentes propios | Importar componentes de otras features (usar `ui/` para compartir) |
| `ui/` | Depender de `theme/` y React | Depender de repositories o features |
| `services/` | Usar módulos Expo nativos (cámara, AV, FS) | Contener SQL |
| `state/` | Contener estado transitorio de sesión/tema | Persistir datos de negocio (eso es SQLite) |

## Dependencias entre capas (permitidas)

```
app/ → features/ → core/repositories → core/db
app/ → ui/ → theme/
features/ → services/ (para fotos, audio, notificaciones)
cualquiera → core/types, core/errors, utils/
```

**Prohibido:** importaciones circulares; `ui/` → `core/repositories`; SQL fuera de `core/db`.
