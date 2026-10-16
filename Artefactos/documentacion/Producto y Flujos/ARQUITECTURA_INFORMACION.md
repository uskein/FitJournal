# 🗺️ Arquitectura de la Información · FitJournal

> Sitemap y reglas de navegación. Nivel 1 = Bottom Tab Bar (componente del Design System).

---

## 1. Sitemap

```
📁 FitJournal
│
├── 🚪 Onboarding (primera vez)
│   ├── Bienvenida (concepto + privacidad)
│   └── Configuración inicial (tema, recordatorio)
│
├── 📱 TAB: Hoy ────────────────────────── pantalla madre
│   ├── Estado del día (MoodCard)
│   ├── Gimnasio hoy (GymCard ▶ empezar)
│   ├── Hábitos del día (chips + racha)
│   ├── Acceso al editor del día
│   └── ⚙️ Ajustes (sheet, desde avatar)
│
├── 📓 TAB: Diario
│   ├── Calendario mensual (mood color · gym · hábitos)
│   ├── Lista de entradas recientes
│   ├── 🔍 Búsqueda global (FTS5)
│   └── 📝 Editor de entrada [date] ── profundo
│       ├── Modos: Libre | Guiado (plantillas) | Rápido
│       ├── Ánimo/energía (ScaleSelector)
│       ├── Notas + #tags
│       ├── Gratitud (máx. 5)
│       ├── Métricas de bienestar
│       ├── 🎙️ Nota de voz
│       ├── ✍️ Sketch
│       ├── 🖼️ Fotos
│       └── Palabra del día + color del día
│
├── 🏋️ TAB: Entrenar
│   ├── Rutinas guardadas
│   │   ├── Detalle/edición [id]
│   │   └── ▶ Sesión en vivo [id] ── profundo
│   │       ├── Ejercicio actual (SetRows + Stepper)
│   │       ├── ⏱️ Timer de descanso
│   │       ├── Historial "última vez" inline
│   │       ├── Fotos de la sesión
│   │       └── 🏁 Finalizar (resumen)
│   ├── 📚 Biblioteca de ejercicios (FTS)
│   │   └── Detalle ejercicio [id] + historial
│   └── ➕ Ejercicio personalizado
│
├── 📈 TAB: Progreso
│   ├── Gráfica de peso por ejercicio
│   ├── Volumen semanal / frecuencia
│   ├── 🔥 Rachas e insignias
│   ├── 💡 Correlaciones
│   └── 🗓️ Mi año (mood map anual)
│
└── ⚙️ Ajustes (sheet)
    ├── Tema (claro/oscuro/sistema)
    ├── Bloqueo biométrico
    ├── Recordatorio diario
    ├── Exportar respaldo (JSON + ZIP)
    ├── Importar respaldo
    ├── Borrar todos los datos
    └── Acerca de
```

---

## 2. Diagrama de navegación

```mermaid
flowchart TB
    OB[Onboarding] --> HOY((TAB Hoy))
    HOY -->|tab| DIARIO((TAB Diario))
    HOY -->|tab| ENTRENAR((TAB Entrenar))
    HOY -->|tab| PROGRESO((TAB Progreso))
    HOY --> AJU[Ajustes · sheet]
    DIARIO --> CAL[Calendario] --> EDIT["Editor de día 🔒"]
    DIARIO --> BUSQ[Búsqueda FTS]
    ENTRENAR --> RUT[Rutinas] --> SESION["Sesión en vivo 🔒"]
    ENTRENAR --> BIB[Biblioteca] --> EJ[Ejercicio [id]]
    PROGRESO --> GRAF[Gráficas]
    PROGRESO --> CORR[Correlaciones]
    PROGRESO --> ANIO[Mi año]
    SESION -.finaliza.-> HOY
    EDIT -.guarda.-> DIARIO
```

---

## 3. Reglas de navegación

| # | Regla | Detalle |
|---|---|---|
| 1 | **Bottom Tab Bar fija** | 4 tabs: Hoy · Diario · Entrenar · Progreso. Activo = chip salvia; badge ámbar = sesión pendiente |
| 2 | **Stack por tab** | expo-router: cada tab empuja pantallas con slide 250ms ease-in-out + gesto de retroceso |
| 3 | **Pantallas profundas** | Editor de día y Sesión en vivo **ocultan los tabs** (concentración); vuelta en 1 tap |
| 4 | **Sheets inferiores** | Plantillas guiadas, añadir ejercicio, finalizar sesión, Ajustes: sheets clay (radio 24, backdrop 40%) |
| 5 | **Regla de los 3 taps** | Nunca más de 3 taps para volver al "Hoy" desde cualquier punto |
| 6 | **Contexto obligatorio** | El diario recibe `date`; la sesión recibe `sessionId`. Deep links soportados |
| 7 | **Ajustes = baja frecuencia** | No es tab: sheet desde el avatar en "Hoy" |

---

## 4. Pantallas profundas (full-screen)

| Pantalla | Ruta | Recibe | Al finalizar |
|---|---|---|---|
| Editor de día | `entrada/[date]` | `date` (YYYY-MM-DD) | Upsert → toast → vuelve a Diario/Hoy |
| Sesión en vivo | `sesion/[id]` | `sessionId` | `finishSession()` → resumen → vuelve a Hoy |

---

## 5. Estados globales de navegación

- **Onboarding** se muestra solo si `settings['onboarding_done']` no existe.
- **Restauración de sesión**: si la app muere con una sesión activa, al reabrir se restaura desde Zustand/SQLite y se ofrece continuar o finalizar.
- **Recordatorio local** abre directamente el Editor del día (deep link interno).
