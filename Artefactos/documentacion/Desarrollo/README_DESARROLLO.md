# FitJournal — Guía de Desarrollo

> Bitácora de vida y gimnasio · 100% local (SQLite) · Expo + TypeScript

---

## Instalación

```bash
npm install
npx expo start          # Expo Go (QR)
npm run typecheck       # tsc --noEmit
npm test                # Jest (23 tests)
npm run lint            # ESLint
```

## Estructura

```
app/                    # Pantallas (expo-router file-based)
  (tabs)/               # Hoy · Diario · Entrenar · Progreso
  entrada/[date].tsx    # Editor del día (profundo)
  sesion/[id].tsx       # Sesión de gym en vivo (profundo)
  rutina/[id].tsx       # Crear/editar rutina
  ejercicio/[id].tsx    # Detalle de ejercicio
  ajustes.tsx           # Ajustes (tema, datos, privacidad)
  onboarding.tsx        # Primera vez (3 pasos)
src/
  core/
    db/                 # database.ts · migrator.ts · migrations/ · seed/
    repositories/       # ÚNICA puerta a los datos (6 repos)
    validation/         # Schemas Zod (frontera de datos)
    types.ts            # 17 entidades
    errors.ts           # AppError con 6 códigos
  features/             # Una carpeta por feature (autocontenida)
    hoy/ diario/ entrenar/
  services/             # photo · audio · export · import · biometric · notification · stats
  state/                # Zustand (sesión en vivo, tema)
  theme/                # tokens · typography · ThemeProvider
  ui/                   # Design System «Warm Clay Editorial» (13 componentes)
  utils/                # fechas ISO, formatos
```

## Comandos clave

| Comando | Qué hace |
|---|---|
| `npm start` | Dev server Expo |
| `npm run typecheck` | Verificación TypeScript strict |
| `npm test` | Suite Jest (repositorios con DB real en memoria) |

## Reglas de código (trazabilidad)

1. **Solo tokens de `src/theme/tokens.ts`** — prohibido hex fuera de ahí.
2. **Solo componentes de `src/ui/`** — prohibido botones/cards propios.
3. **SQL solo en `src/core/repositories/`** — las pantallas nunca tocan SQLite.
4. **Toda escritura pasa por Zod** antes de la DB.
5. **Los 4 estados de cada pantalla** son obligatorios (Loading/Empty/Success/Error).
6. **Terracota solo en gym** (regla del manual visual).

## Base de datos

- Motor: expo-sqlite (WAL + foreign_keys)
- Migraciones: `PRAGMA user_version` + scripts numerados en `src/core/db/migrations/`
- Seed: 39 ejercicios + 7 plantillas + 6 prompts (1er arranque)
- Búsqueda: FTS5 (diario + ejercicios) con triggers de sincronización

## Tests

- Jest + better-sqlite3 (SQLite real en memoria)
- Mock de expo-sqlite: `src/core/db/__tests__/expo-sqlite-mock.ts`
- 23 tests: diary (10) · workout (8) · habit (5)
- Cubren: UPSERT, PRs, CONFLICT, cascadas, FTS, streak, Zod

## Despliegue (EAS)

```bash
npm install -g eas-cli
eas login
eas build --profile preview
eas build --profile production
eas submit --platform all
```

## Referencias del proyecto (opencode.json)

- `identidad-visual` → Design System SSoT
- `arquitectura` → stack, ADR, patrones
- `producto-flujos` → HU, blueprints, flujos
