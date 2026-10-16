# 🎬 Flujos de Usuario · FitJournal

> Happy paths y flujos alternativos/borde. Simulación jugable: `../Flujos/FLUJOS_VISUAL.html`

---

## 1. F1 — Registrar el día (HU-01) · Ana

```mermaid
sequenceDiagram
    participant U as Ana
    participant H as Tab Hoy
    participant E as Editor
    participant R as diaryRepository
    U->>H: Abre la app (sin entrada hoy)
    H->>R: getEntryByDate(hoy) → null
    H-->>U: EmptyState blob 📓
    U->>H: Toca "Crear entrada de hoy"
    H->>E: push(entrada/[date]) · slide 250ms
    U->>E: Selecciona ánimo 4 (spring)
    E->>R: upsertEntry({mood:4}, hoy)
    U->>E: Escribe nota
    E->>R: upsertEntry({notes}) — auto-guardado
    U->>E: Añade gratitud
    E->>R: addGratitude()
    E-->>U: Toast ✓ + vuelta a Hoy (MoodCard coloreada)
```

**Ramas:**
- Sueño fuera de rango → Zod rechaza → **Toast** error → corrige.
- Salir con cambios → **Sheet** descartar/guardar.

---

## 2. F2 — Entrenamiento completo (HU-02/03/04) · Marcos

```mermaid
flowchart TD
    A[GymCard: ▶ Empezar sesión] --> B[startSession]
    B --> C{¿sesión activa ya?}
    C -- sí --> D[Toast CONFLICT → continuar existente]
    C -- no --> E[Ejercicio activo]
    E --> F[Veo "Última vez: 80kg×5"]
    F --> G[Ajusto Stepper ±2.5kg]
    G --> H[Completo serie → check spring]
    H --> I[completeSet() persiste YA]
    I --> J{¿nuevo récord?}
    J -- sí --> K[is_pr=1 · Badge 🏆 · Toast PR]
    J -- no --> L[Timer descanso]
    K --> L
    L --> H
    H --> M[🏁 Finalizar → Sheet resumen]
    M --> N[finishSession → Hoy]
    I -.fallo SQL.-> O[Serie ✗ no guardada → Reintentar]
    H -.retroceso.-> P[Sheet: ¿Abandonar?<br/>Tu progreso queda guardado]
```

**Garantía:** cada serie se persiste al instante → un crash o abandono **no pierde** lo entrenado.

---

## 3. F3 — Diario creativo (HU-05/09/14/15) · Lucía

```mermaid
flowchart TD
    A[Editor del día] --> B{¿Qué quiero expresar?}
    B --> C[Plantilla guiada «Cierre del día»]
    B --> D[Mantener 🎙️ → grabar voz]
    B --> E[✍️ Sketch a mano]
    B --> F[Escribir libre]
    C --> G[Respondo 3 preguntas]
    D --> H{¿Permiso de micrófono?}
    H -- permitido --> I[Audio guardado en audio_notes]
    H -- DENEGADO --> J[Card explicativa + CTA Abrir ajustes<br/>el editor sigue usable]
    G --> K[Guardar → upsert → ✓]
    I --> K
    E --> K
    F --> K
    K --> L[Toast ✓ + badges multimedia]
```

---

## 4. F4 — Exportar respaldo (HU-16)

```mermaid
flowchart TD
    A[Ajustes: 📤 Exportar] --> B[exportBackup: JSON + ZIP]
    B --> C[Progress: Empaquetando tus recuerdos…]
    C --> D[Share Sheet del sistema]
    D --> E[Usuario elige destino<br/>AirDrop · Drive · Archivos]
```

---

## 5. Flujos alternativos y de borde

| # | Caso | Disparador | Comportamiento |
|---|---|---|---|
| B1 | **Validación fallida** | Sueño = 30 | Zod rechaza → Toast `VALIDATION` + campo marcado; nada se escribe |
| B2 | **Permiso denegado** | 🎙️ sin permiso | Card + CTA "Abrir ajustes"; editor usable sin voz |
| B3 | **Storage full** | Foto sin espacio | Toast `STORAGE_FULL` + sugerencia de liberar |
| B4 | **Conflicto de sesión** | 2ª sesión activa | Toast `CONFLICT` → continuar la existente |
| B5 | **Fallo de escritura** | Error SQL en serie | Serie "✗ no guardada" + **Reintentar** (el resto intacto) |
| B6 | **Cancelación de sesión** | Retroceso a mitad | Sheet *"¿Abandonar? Tu progreso queda guardado"* |
| B7 | **Cancelación de edición** | Salir sin guardar | Sheet descartar/guardar |
| B8 | **DB corrupta al arrancar** | integrity_check falla | Pantalla de error + "Reintentar" + acceso a importar respaldo |
| B9 | **Import inválido** | JSON que falla Zod | Rechazo **antes** de tocar la DB + informe de errores |
| B10 | **Recordatorio** | Notificación 21:00 | Deep link directo al Editor del día |

---

## 6. Diagrama de estados de la sesión de gym (HU-02)

```mermaid
stateDiagram-v2
    [*] --> Inactiva
    Inactiva --> EnCurso: startSession
    EnCurso --> SeriePendiente: siguiente serie
    SeriePendiente --> SerieCompletada: toque completo (persiste ya)
    SerieCompletada --> EnPR: weight×reps > histórico
    SerieCompletada --> Descanso: timer rest_seconds
    EnPR --> Descanso
    Descanso --> SeriePendiente
    SeriePendiente --> Fallida: error SQL → reintento
    Fallida --> SeriePendiente: Reintentar
    EnCurso --> Resumen: 🏁 finalizar
    Resumen --> [*]: finishSession → Hoy
    EnCurso --> Pausada: retroceso (sheet confirma)
    Pausada --> EnCurso: continuar
    Pausada --> Resumen: abandonar (progreso guardado)
```

---

## 7. Garantías transversales de flujo

1. **Ningún error bloquea el camino principal** — toda rama de error ofrece salida (reintento, guía, cancelación segura).
2. **Nunca se pierde trabajo del usuario** — persistencia incremental (series) y auto-guardado (diario).
3. **Confirmaciones solo en acciones destructivas** — borrar datos, abandonar sesión, descartar edición.
4. **Máximo 3 taps** de vuelta al "Hoy" desde cualquier punto.
5. **Feedback siempre visible** — todo cambio de estado tiene spring, toast o check.
