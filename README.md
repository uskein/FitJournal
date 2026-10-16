# 📓🏋️ FitJournal

> **Tu bitácora de vida y gimnasio, unificada en un solo lugar.**
> 100% local · Sin cuentas · Sin nube · Tus datos nunca salen de tu dispositivo.

FitJournal conecta **cómo viviste el día** (sueño, ánimo, gratitud) con **cómo entrenaste** (pesos, reps, PRs) — algo que ninguna app hace bien. Es una app móvil **local-first** construida con React Native + Expo y una base de datos **SQLite** puramente local.

---

## ✨ Funcionalidades

### 📓 Diario creativo (E1)
- **Entrada por día** — una sola entrada por fecha (UPSERT), nunca duplicados
- **3 modos de escritura** — Libre · Guiado (plantillas) · Rápido
- **Check-in en segundos** — ánimo y energía con `ScaleSelector` táctil (5 botones con rebote clay)
- **Gratitud diaria** — hasta 3 cosas buenas por día (máx. 500 caracteres)
- **Plantillas guiadas** — «Cierre del día», «Morning Pages», «Desahogo», «Una línea al día»
- **#Etiquetas** — se extraen automáticamente del texto de notas
- **Palabra y color del día** — mood color map de paleta cerrada
- **Métricas de bienestar** — agua, meditación, lectura, pasos
- **Búsqueda full-text** (FTS5) sobre todas tus notas

### 🖼️ Multimedia creativa (E1+)
- **Fotos** — cámara o galería, comprimidas JPEG ~70% con thumbnail, guardadas en filesystem (nunca BLOB en la DB)
- **Notas de voz** — graba con un toque, se asocia a la entrada del día
- **Sketch a mano** — dibuja con el dedo (SVG + gestos), los trazos se guardan como JSON vectorial

### 🏋️ Gimnasio (E2)
- **Biblioteca de ejercicios** — 39 ejercicios precargados con búsqueda FTS
- **Rutinas** — crea, edita y reutiliza tus rutinas con ejercicios ordenados
- **Sesión en vivo** — registra series en un toque (peso ±2.5 kg · reps · RPE)
- **Detección automática de PRs** — la app celebra tus récords con badge y toast 🏆
- **Historial "última vez"** — ve qué hiciste la última vez con ese ejercicio mientras entrenas
- **Persistencia incremental** — cada serie se guarda al instante; un crash no pierde nada
- **Timer de descanso** — cuenta regresiva entre series
- **Restauración de sesión** — si la app se cierra, se reconstruye desde la DB

### 📈 Progreso (E4)
- **Mejor marca global** — tu récord en BigData editorial
- **Volumen semanal** — barras de series completadas por semana
- **Racha de días** — insignia 🔥 con contador
- **Correlaciones** — *«Los días que dormiste más de 7h, tu RPE promedio bajó X puntos»* (el diferencial de FitJournal)
- **Mi año** — mood color map anual: tu vida en un mosaico de colores

### 🔒 Confianza y privacidad (E5)
- **100% local** — sin servidor, sin cuenta, sin analytics, sin llamadas de red
- **Exportar respaldo** — JSON con todas las tablas + metadata de versión
- **Importar respaldo** — validación Zod completa + transacción con rollback
- **Borrar todos los datos** — elimina DB + archivos + settings (derecho al olvido)
- **Bloqueo biométrico** — Face ID / huella (opcional)
- **Recordatorio diario** — notificación local amable a las 21:00
- **Modo oscuro** — verde carbón cálido, íntimo

### 🏠 Onboarding y "Hoy" (E3)
- **Onboarding** — 3 pasos: privacidad → tema → recordatorio
- **Tab "Hoy"** — dashboard del día completo: MoodCard + GymCard + hábitos + acceso al diario
- **Hábitos con racha** — chips táctiles con streak 🔥

---

## 🎨 Identidad visual — «Warm Clay Editorial»

| Elemento | Decisión |
|---|---|
| **Concepto** | Claymorphism cálido (diario) + lenguaje editorial para datos (gym) |
| **Paleta** | Verde salvia `#3E6B60` · Terracota `#C67B5C` (gym) · Ámbar `#E0A458` (logros) · Crema `#FAF6F0` |
| **Tipografía** | Fraunces (títulos) · Nunito Sans (cuerpo) · JetBrains Mono (datos/PRs) |
| **Regla de oro** | *El diario se vive en clay · los datos se muestran en editorial* |

Los tokens de diseño viven en `src/theme/tokens.ts` — la única fuente de verdad de colores, espaciados, radios, sombras clay y movimientos.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo SDK 58 |
| Lenguaje | TypeScript (strict) |
| Navegación | expo-router (file-based) |
| Base de datos | expo-sqlite (WAL + FTS5 + triggers) |
| Migraciones | `PRAGMA user_version` + scripts numerados |
| Estado | Zustand (sesión en vivo, tema) |
| Validación | Zod (frontera de datos) |
| Animación | react-native-reanimated (springs clay) |
| Gestos | react-native-gesture-handler |
| Imágenes | expo-image-picker + expo-image-manipulator |
| Voz | expo-av |
| Gráficas | react-native-svg + barras nativas |
| Tests | Jest + better-sqlite3 (SQLite real en memoria) |

---

## 🚀 Ejecución local

### Requisitos
- Node.js 20+
- Expo Go instalado en tu móvil (App Store / Play Store)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar el dev server
npx expo start

# 3. Escanear el QR con Expo Go (misma red WiFi)
```

El dev server arranca en `http://localhost:8081`. La app crea la base de datos SQLite, ejecuta las migraciones y carga el seed de ejercicios en el primer arranque.

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm start` | Dev server Expo |
| `npm run typecheck` | Verificación TypeScript strict |
| `npm test` | Suite Jest (23 tests de repositorios) |
| `npm run lint` | ESLint |

---

## 📂 Estructura del proyecto

```
fitjournal/
├── app/                    # Pantallas (expo-router)
│   ├── (tabs)/             # Hoy · Diario · Entrenar · Progreso
│   ├── entrada/[date].tsx  # Editor del día
│   ├── sesion/[id].tsx     # Sesión de gym en vivo
│   ├── rutina/[id].tsx     # Crear/editar rutina
│   ├── ejercicio/[id].tsx  # Detalle de ejercicio
│   ├── ajustes.tsx         # Ajustes
│   └── onboarding.tsx      # Primera vez
├── src/
│   ├── core/
│   │   ├── db/             # database, migrator, migrations, seed
│   │   ├── repositories/   # Única puerta a los datos (6 repos)
│   │   ├── validation/     # Schemas Zod
│   │   ├── types.ts        # 17 entidades
│   │   └── errors.ts       # AppError tipado
│   ├── features/           # Una carpeta por feature (autocontenida)
│   ├── services/           # photo, audio, export, import, biometric, notification, stats
│   ├── state/              # Zustand stores
│   ├── theme/              # Design tokens + tipografía + ThemeProvider
│   ├── ui/                 # Design System (13 componentes)
│   └── utils/              # Fechas ISO, formatos
├── Artefactos/             # Documentación completa del proyecto
│   └── documentacion/
│       ├── Diseño Visual/          # Brand Book + manual SSoT
│       ├── Arquitectura/           # 5 MD técnicos + ADR
│       ├── Producto y Flujos/      # HU, blueprints, flujos
│       ├── Requerimientos/         # Showcase visual
│       ├── ArquitecturaInformacion/# Mapa navegable
│       ├── Blueprints/             # Storybook 4 estados
│       ├── Flujos/                 # Simulación jugable
│       ├── DocumentacionMaestra/   # Hub central
│       ├── Orquestador/            # Plan de sprints
│       └── Desarrollo/             # README de desarrollo
├── opencode.json           # Referencias del proyecto (SSoT)
├── eas.json                # Perfiles de build EAS
└── app.config.ts           # Config Expo (permisos, plugins)
```

---

## 🧪 Tests

```bash
npm test
```

23 tests sobre **SQLite real** (better-sqlite3 en memoria con FTS5):

| Suite | Tests | Cubre |
|---|---|---|
| diaryRepository | 10 | UPSERT por día, gratitud límite, mood color cerrado, FTS |
| workoutRepository | 8 | Detección de PRs, CONFLICT de sesión, persistencia incremental |
| habitRepository | 5 | Toggle, racha consecutiva |

---

## 📖 Documentación

El proyecto incluye documentación completa en `Artefactos/documentacion/`:

- **Identidad visual** — Brand Book interactivo + manual técnico (tokens, componentes, accesibilidad)
- **Arquitectura** — Stack, ADR, modelo de datos, contratos, DevOps/seguridad
- **Producto y flujos** — 3 actores, 5 épicas, 16 historias con criterios, blueprints, flujos jugables
- **Orquestador** — Plan de 9 sprints con trazabilidad completa

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
