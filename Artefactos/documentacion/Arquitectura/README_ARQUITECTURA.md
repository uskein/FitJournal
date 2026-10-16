# 🏗️ README — Arquitectura Técnica · FitJournal

> **Proyecto:** FitJournal — Bitácora de vida + gimnasio (diario creativo + rutinas de entrenamiento)
> **Plataforma:** Móvil (iOS / Android) — React Native + Expo
> **Modelo de datos:** 100% local, SQLite (cero sync, cero backend)
> **Identidad visual:** «Warm Clay Editorial» (ver `../Diseño Visual/manual-identidad-visual.md`)
> **Versión:** 1.0 · Estado: Aprobada

---

## 1. Resumen ejecutivo

FitJournal es una aplicación **local-first**: todos los datos viven en el dispositivo del usuario (SQLite + filesystem), sin servidor, sin cuenta y sin llamadas de red. La arquitectura es un **monolito modular con capas Clean-lite**: pantallas → hooks → repositorios → SQLite/filesystem. Los repositorios exponen contratos tipados estilo API, lo que deja la puerta abierta a un sync futuro sin reescribir la UI.

## 2. Stack tecnológico (aprobado)

### Cliente

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | React Native + Expo (SDK actual) | Una base de código iOS/Android; EAS Build/Update |
| Lenguaje | TypeScript (strict) | Modelado tipado de entidades y repositorios |
| Navegación | expo-router | File-based routing, deep links |
| Animación | react-native-reanimated | Springs clay a 60fps en UI thread (obligatorio desde scaffold) |
| Gestos | react-native-gesture-handler | Escalas táctiles, swipe, sketch |
| SVG/gráficas | react-native-svg + react-native-gifted-charts | Blobs morphing, gráficas de progreso |
| Gradientes | expo-linear-gradient | Mood cards, progress bars |
| Tipografías | @expo-google-fonts (fraunces, nunito-sans, jetbrains-mono) | Identidad visual |
| Fotos | expo-image-picker + expo-image-manipulator | Captura + compresión ~70% + thumbnails |
| Archivos | expo-file-system | Fotos y audios fuera de la DB |
| Voz | expo-av | Notas de voz |
| Blur | expo-blur (acotado, con fallback) | Sheets/modales |
| Recordatorios | expo-notifications (locales) | Sin push server |
| Biométrico | expo-local-authentication | Bloqueo opcional del diario |

### Datos

| Capa | Tecnología | Justificación |
|---|---|---|
| Motor | SQLite vía expo-sqlite (async) | Decisión del usuario; oficial; WAL |
| Búsqueda | FTS5 | Instantánea sobre diario y ejercicios |
| Migraciones | `PRAGMA user_version` + scripts SQL numerados | Control total sin ORM |
| Validación | Zod (frontera de repositorios) | Security by design |
| Estado global | Zustand | Sesión en vivo, tema, onboarding |
| Preferencias | Tabla `settings` en SQLite | Todo el dato se exporta con el respaldo |

### Descartados y por qué

| Alternativa | Motivo de descarte |
|---|---|
| Backend (Node, Supabase, Firebase) | Premisa: cero sync, privacidad local |
| WatermelonDB | Diseñado para sync online; sobre-ingeniería |
| Realm | No es SQLite; motor y migraciones propios |
| ORM (Drift/Kysely) | Se eligió SQLite puro para control y aprendizaje |
| Skia | Poderoso pero pesado; SVG+Reanimated cubre el diseño |
| MMKV/AsyncStorage para settings | Preferencias en SQLite → se exportan con el backup |

## 3. Patrones arquitectónicos

```
UI (app/) → Hooks (features/) → Repositorios (core/repositories/) → DataSource (core/db + filesystem)
```

- **Única puerta a los datos:** los repositorios. Ninguna pantalla ejecuta SQL.
- **Contratos estilo API:** métodos tipados + `AppError` con códigos (`VALIDATION`, `NOT_FOUND`, `DB_ERROR`...).
- **Feature-first:** cada feature es autocontenida (`components/`, `hooks/`) y se puede eliminar sin romper el resto.
- **Design system centralizado:** toda la UI de componentes vive en `src/ui/` implementando el manual visual.

## 4. Flujo de datos

1. **Escritura:** UI → hook → repositorio (transacción SQL parametrizada) → evento de invalidación → hook refresca → UI.
2. **Sesión de gym en vivo:** estado en Zustand (respuesta inmediata al toque) + **persistencia incremental por serie completada** (resiste crashes).
3. **Lectura:** repositorios devuelven entidades tipadas ya normalizadas.

## 5. Decisiones de resiliencia

| Riesgo | Mitigación |
|---|---|
| Crash en sesión | Persistencia por serie (no solo al finalizar) |
| Corrupción de DB | WAL + foreign_keys + integrity_check periódico + export del usuario |
| Fotos huérfanas | Borrado en cascada lógico en repositorio |
| Rendimiento en listas | FlatList virtualizada + React.memo + agregaciones en SQL |

## 6. ADR — Architecture Decision Records

### ADR-001: Local-first sin backend
- **Contexto:** privacidad como valor; coste cero de infraestructura; uso sin conexión.
- **Decisión:** SQLite + filesystem como única persistencia; sin API de red.
- **Alternativas:** Supabase/Firebase (sync nativo), backend propio.
- **Consecuencias:** ✅ privacidad, $0, offline total · ❌ sin multi-dispositivo (export manual como escape hatch).

### ADR-002: expo-sqlite puro, sin ORM
- **Contexto:** control total sobre consultas, FTS5 y rendimiento.
- **Decisión:** SQL parametrizado manual + migraciones SQL numeradas.
- **Alternativas:** Drift, WatermelonDB, Realm.
- **Consecuencias:** ✅ sin capa extra, aprendizaje del motor · ❌ más verbosidad; se mitiga con repositorios tipados.

### ADR-003: Reanimated desde el scaffold
- **Contexto:** el diseño clay exige springs y morphing a 60fps.
- **Decisión:** instalar reanimated + gesture-handler en el arranque (config de Babel).
- **Consecuencias:** ✅ movimiento fluido en UI thread · ❌ dependencia nativa que requiere dev build si se usan módulos no incluidos en Expo Go.

### ADR-004: Imágenes en filesystem, no BLOB
- **Contexto:** SQLite no es ideal para binarios grandes.
- **Decisión:** rutas + metadatos en tablas; binarios en `FileSystem.documentDirectory`; thumbnails pequeños para listas.
- **Consecuencias:** ✅ DB ligera, respaldo en ZIP natural · ❌ debe existir limpieza de huérfanos.

### ADR-005: Migración futura a SQLCipher para cifrado
- **Contexto:** diario = dato íntimo; premium feature "diario cifrado".
- **Decisión:** mantener repositorios agnósticos del motor para migrar de expo-sqlite a op-sqlite (SQLCipher) sin tocar UI.
- **Consecuencias:** ✅ puerta abierta al cifrado · ❌ requiere prebuild (saca de Expo Go).

### ADR-006: Estado vivo de gym en Zustand + persistencia incremental
- **Contexto:** registrar series debe ser instantáneo; un crash no puede perder la sesión.
- **Decisión:** Zustand durante la sesión; cada serie completada se escribe en SQLite al instante.
- **Consecuencias:** ✅ rapidez + durabilidad · ❌ lógica de reconciliación sencilla al reabrir sesión.

## 7. Mapa de la documentación

| Documento | Contenido |
|---|---|
| `README_ARQUITECTURA.md` | Este documento (stack, patrones, ADR) |
| `ESTRUCTURA_DIRECTORIOS.md` | Árbol detallado con responsabilidades |
| `MODELO_DE_DATOS.md` | ERD, tablas, índices, migraciones, diccionario |
| `CONTRATOS_API.md` | Contratos de repositorios, validación, errores |
| `GUIA_DEVOPS_SEGURIDAD.md` | Entorno local, CI/CD, EAS, seguridad MASVS |
