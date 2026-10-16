# 🎨 Manual de Identidad Visual — FitJournal

> **Proyecto:** FitJournal — Bitácora de vida + gimnasio (React Native / Expo, SQLite local)
> **Identidad:** «Warm Clay Editorial» (fusión aprobada)
> **Versión:** 1.0
> **Rol de este documento:** Single Source of Truth (SSoT). Cualquier sesión futura del proyecto debe consultar este manual antes de crear o modificar UI.

---

## 1. Resumen de la identidad

**Concepto:** Claymorphism orgánico cálido como base, con lenguaje editorial para datos de rendimiento.

> **Regla de oro:** *El diario se vive en clay (calidez táctil) · los datos se muestran en editorial (números gigantes, kickers).*

| Dimensión | Expresión |
|---|---|
| Diario / bienestar | Superficies infladas, sombras dobles suaves, radios grandes, Fraunces, colores terrosos |
| Gimnasio / datos | JetBrains Mono grande (PRs como titulares), kickers en mayúsculas con tracking, terracota |
| Movimiento | Física de goma suave: springs, respiración, rebotes. Nunca seco ni lineal |
| Personalidad global | Íntimo, cálido, honesto, con rigor cuando el dato aparece |

---

## 2. Tokens de diseño

### 2.1 Colores — JSON

```json
{
  "color": {
    "primary":          { "base": "#3E6B60", "pressed": "#335A50", "soft": "#DCE9E4" },
    "secondary":        { "base": "#C67B5C", "pressed": "#B06A4D", "soft": "#F3E1D8", "badgeText": "#8F4E33" },
    "accent":           { "base": "#E0A458", "soft": "#FCEFD9", "badgeText": "#8A5B14" },
    "surface":          { "base": "#FAF6F0", "elevated": "#FFFFFF", "field": "#F4EFE8", "border": "#E8E0D6" },
    "text":             { "primary": "#2B2B2B", "muted": "#6E6A65", "inverse": "#FFFFFF" },
    "state":            { "success": "#4E8C6A", "error": "#C0504D", "warning": "#E0A458" },
    "disabled":         { "bg": "#DCE9E4", "text": "#A8A29A" },
    "dark":             { "surface": "#1B201E", "elevated": "#242B29", "text": "#EDE8E1", "muted": "#9FB8B0", "border": "#333D3A" },
    "moodColors":       ["#4E8C6A", "#3E6B60", "#E0A458", "#C67B5C", "#C0504D", "#7A6FB0", "#5B8FA8"]
  }
}
```

> `moodColors`: paleta fija para el "Mood Color Map" del diario (de mejor a peor ánimo + neutros). El color del día se elige de esta lista cerrada; nunca inventar colores fuera de ella.

### 2.2 Colores — CSS Custom Properties (para web/prototipos)

```css
:root{
  --primary:#3E6B60; --primary-pressed:#335A50; --primary-soft:#DCE9E4;
  --secondary:#C67B5C; --secondary-pressed:#B06A4D; --secondary-soft:#F3E1D8;
  --accent:#E0A458; --accent-soft:#FCEFD9;
  --surface:#FAF6F0; --elevated:#FFFFFF; --field:#F4EFE8; --border:#E8E0D6;
  --text:#2B2B2B; --muted:#6E6A65;
  --success:#4E8C6A; --error:#C0504D;
  --dark-surface:#1B201E; --dark-elevated:#242B29; --dark-text:#EDE8E1;
}
```

### 2.3 Roles semánticos y reglas de asignación

| Rol semántico | Color | Regla estricta |
|---|---|---|
| Acción primaria | `primary #3E6B60` | Máximo 1 botón primario visible por pantalla |
| Acción de gimnasio | `secondary #C67B5C` | **Solo** acciones/acentos de contenido gym (empezar sesión, PRs) |
| Logro / celebración | `accent #E0A458` | **Solo** insignias, rachas, foco accesible. Nunca acción principal |
| Fondo general | `surface #FAF6F0` | Nunca blanco puro en fondo de pantalla |
| Superficie alzada | `elevated #FFFFFF` | Solo con sombra clay obligatoria |
| Campo de entrada | `field #F4EFE8` | Fondo "hundido" de inputs |
| Texto principal | `text #2B2B2B` | — |
| Texto secundario | `muted #6E6A65` | Nunca para títulos ni acciones |
| Éxito | `success #4E8C6A` | Toasts de éxito, hábitos completados |
| Error | `error #C0504D` | Validaciones, destrucción, alertas |

### 2.4 Espaciado (Spacing)

Escala base 4. **No usar valores fuera de esta lista.**

```
space-1: 4    space-2: 8    space-3: 12   space-4: 16
space-5: 20   space-6: 24   space-8: 32   space-10: 40
```

| Contexto | Valor |
|---|---|
| Padding de card | 20 (móvil) / 24 (tabla) |
| Separación entre cards | 16 |
| Separación de secciones | 32 |
| Margen de pantalla (horizontal) | 20 |

### 2.5 Radios (Border Radius)

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 8 | Checkboxes, elementos pequeños |
| `radius-md` | 14 | Inputs, toasts |
| `radius-lg` | 16 | Botones |
| `radius-xl` | 24 | Cards, modales, sheets |
| `radius-pill` | 999 | Badges, chips, botones de icono, progress |

### 2.6 Sombras (Clay)

La sombra clay es **obligatoria** en toda superficie elevada (cards, modales, botones principales). Combina sombra externa + highlight interno:

```
Card:      shadowColor #3E6B60 · opacity 0.08 · radius 24 · offsetY 8
           + highlight interno: borde superior rgba(255,255,255,0.8) 1px
Botón:     shadowColor #3E6B60 · opacity 0.25 · radius 14 · offsetY 6
Terracota: shadowColor #C67B5C · opacity 0.30 · radius 14 · offsetY 6
```

**Prohibido:** sombras clay sobre elementos flat (badges, texto, líneas).

React Native:

```ts
export const clayShadow = {
  shadowColor: '#3E6B60',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};
```

### 2.7 Tipografía

| Familia | Rol | Pesos | Escala (móvil) |
|---|---|---|---|
| **Fraunces** | Display y títulos | 600 SemiBold, 700 Bold | 24 · 28 · 34 · 40 |
| **Nunito Sans** | Cuerpo, UI, botones | 400 Regular, 600 SemiBold, 700 Bold | 12 · 14 · 16 · 18 |
| **JetBrains Mono** | Datos, pesos, PRs, rachas | 500 Medium, 700 Bold | 14 · 18 · 24 · 34 · 48 |

| Estilo | Familia | Tamaño | Peso | Notas |
|---|---|---|---|---|
| Display | Fraunces | 34-40 | 700 | Letter-spacing -0.5 |
| H1 pantalla | Fraunces | 28 | 600 | — |
| H2 sección | Fraunces | 22-24 | 600 | — |
| Cuerpo | Nunito Sans | 16 | 400 | Line-height 1.5 |
| Cuerpo pequeño | Nunito Sans | 14 | 400 | — |
| Caption | Nunito Sans | 12-13 | 600 | — |
| **Kicker (editorial)** | Nunito Sans | 11 | 700 | **UPPERCASE · letter-spacing 0.18em · color muted o secundario** |
| Botón | Nunito Sans | 16 | 600 | — |
| Dato grande | JetBrains Mono | 24-48 | 700 | PRs y récords (alma editorial) |
| Dato pequeño | JetBrains Mono | 14-18 | 500-700 | Pesos en listas, stats |

**Regla de fusión:** todo número de gimnasio (peso, reps, PR, racha, duración) se muestra en **JetBrains Mono**. Etiquetas de sección usan **kicker** editorial.

### 2.8 Z-Index

```
base: 0 · card: 1 · header: 10 · tabbar: 20
sheet/backdrop: 50 · modal: 60 · toast: 90
```

### 2.9 Breakpoints (tablet/web futuro)

```
compact: < 380   · base: 380-767   · medium: 768-1023   · expanded: ≥ 1024
```

---

## 3. Reglas y prohibiciones de color

| ✅ Permitido | ❌ Prohibido |
|---|---|
| Terracota en badges/PRs/botón "Empezar rutina" | Terracota en botón "Guardar" o navegación general |
| Ámbar en rachas, insignias, anillo de foco | Ámbar como fondo grande o botón primario |
| Crema como fondo de pantalla | Blanco puro (#FFFFFF) como fondo de pantalla |
| Blanco solo en cards elevadas (con sombra clay) | Cards blancas sin sombra (quedan planas y rompen el estilo) |
| Gradientes suaves del mood en cards del día | Gradientes saturados multicolor |
| Máximo 2 colores saturados por card | Combinar terracota + ámbar saturados juntos |

---

## 4. Componentes — Directrices estrictas

### 4.1 Botón primario
- Fondo: gradiente `#456F64 → #3E6B60`, radio 16, altura 52, texto blanco Nunito Sans 600/16
- Sombra clay botón obligatoria; al presionar: escala 0.97 + sombra aplana + fondo `#335A50`
- Focus accesible: anillo 3px `#E0A458` con offset 2
- Disabled: fondo `#DCE9E4`, texto `#A8A29A`, sin sombra
- **Máximo 1 botón primario por pantalla visible** (jerarquía)

### 4.2 Botón gym (secundario)
- Fondo: gradiente `#CE8465 → #C67B5C`, mismas medidas
- Uso **exclusivo** de acciones de gimnasio

### 4.3 Botón terciario / fantasma
- Transparente, texto `#3E6B60` SemiBold; pressed: fondo `#DCE9E4` al 60%

### 4.4 Botón de icono
- 48×48 circular, fondo `#DCE9E4`, icono `#3E6B60` (24), pressed escala 0.92

### 4.5 Cards
- Fondo `#FFFFFF`, radio 24, padding 20, sombra clay **obligatoria**
- **Card del día (diario):** gradiente del mood color (14% opacidad → blanco), barra superior de color pleno 6px
- **Card de gym:** barra superior terracota 6px; datos en JetBrains Mono grande

### 4.6 Inputs
- Fondo `#F4EFE8`, radio 14, altura 52, borde 2px transparente
- Focus: borde `#3E6B60` + fondo blanco + glow `rgba(62,107,96,0.12)` radio 4
- Error: borde `#C0504D` + mensaje 12px debajo
- Disabled: fondo `#EDE7DE`, texto `#A8A29A`

### 4.7 Escalas táctiles (ánimo / energía / RPE) — componente insignia
- 5 botones circulares de 52; seleccionado: escala 1.22 + sombra clay + fondo `#DCE9E4`
- Transición spring (tension 400, friction 12)

### 4.8 Stepper (pesos, reps)
- Contenedor radio 14 fondo `#F4EFE8`; botones ± circulares `#DCE9E4`
- Valor central **JetBrains Mono Bold 20** — los números siempre en mono

### 4.9 Badges / Tags
| Tipo | Fondo | Texto |
|---|---|---|
| Hábito | `#DCE9E4` | `#3E6B60` |
| PR / gym | `#F3E1D8` | `#8F4E33` |
| Racha / logro | `#FCEFD9` | `#8A5B14` |
| Etiqueta diario | transparente + borde `#E8E0D6` | `#6E6A65` |

Radio pill, padding 6/14, texto 12 Bold. **Nunca con sombra clay** (son flat).

### 4.10 Toast
- Fondo `#2B2B2B`, texto blanco, radio 14, borde inferior 4px (verde éxito / rojo error), auto-ocurre 3s, entra con spring desde abajo

### 4.11 Progress bar
- Track `#E8E0D6`, fill gradiente `#3E6B60 → #E0A458`, radio pill, altura 10

### 4.12 Modal / Sheet
- Fondo blanco, radio 24 (sheets: solo radio superior), backdrop `#2B2B2B` 40% + blur
- Acciones apiladas verticalmente (una sola mano)

### 4.13 Bottom Tab Bar (4 tabs: Hoy · Diario · Entrenar · Progreso)
- Fondo blanco, borde superior `#E8E0D6`, altura 64 + safe area
- Activo: icono `#3E6B60` + chip pill `#DCE9E4` detrás del icono
- Inactivo: `#6E6A65`. Badge ámbar opcional (punto)

### 4.14 Empty states
- Blob orgánico con morphing animado + título Fraunces + frase cálida + CTA
- **Nunca** usar el símbolo ∅ frío ni ilustraciones ajenas al estilo

---

## 5. Movimiento

| Elemento | Curva | Duración |
|---|---|---|
| Press de botón | spring (tension 400, friction 12) | ~300ms |
| Navegación | ease-in-out | 250ms |
| Acordeón | ease-out | 200ms |
| Check de hábito | spring | 350ms |
| Guardar serie gym | ease-out | 180ms |
| Toast entrada/salida | spring / ease-in | 300 / 200ms |

- **Prohibido:** transiciones lineales o secas sin easing.
- **Obligatorio:** respetar `prefers-reduced-motion` (deshabilitar springs y morphing).

---

## 6. Accesibilidad (WCAG 2.1 AA)

| Par | Ratio | Estado |
|---|---|---|
| `#2B2B2B` sobre `#FAF6F0` | ~12:1 | ✅ AAA |
| Blanco sobre `#3E6B60` | ~5.1:1 | ✅ AA (texto normal) |
| Blanco sobre `#C67B5C` | ~3.4:1 | ⚠️ AA solo ≥18.66px bold o 24px — botones cumplen (16px SemiBold: **usar sobre texto grande o badge con fondo**; para botón gym de 16px, aceptable por ser ≥3:1 en UI grande; si se requiere AA estricto en texto pequeño, oscurecer a `#B06A4D`) |
| `#6E6A65` sobre `#FAF6F0` | ~4.7:1 | ✅ AA |
| `#EDE8E1` sobre `#1B201E` | ~12:1 | ✅ AAA |
| Ámbar `#E0A458` como anillo de foco | visible sobre crema y oscuro | ✅ |

**Reglas:**
- Todo control táctil mínimo **44×44**
- Focus visible obligatorio (anillo ámbar 3px) en navegación por teclado/switch control
- Iconos decorativos con `accessibilityElementsHidden`; botones de icono con label
- Escalas de ánimo: anunciar valor ("Ánimo, 3 de 5")
- Respetar tamaño de fuente del sistema hasta 200% sin cortar texto

---

## 7. Modo oscuro

| Token claro | Token oscuro |
|---|---|
| surface `#FAF6F0` | `#1B201E` |
| elevated `#FFFFFF` | `#242B29` |
| text `#2B2B2B` | `#EDE8E1` |
| muted `#6E6A65` | `#9FB8B0` |
| border `#E8E0D6` | `#333D3A` |
| primary/secondary/accent | **se mantienen** (verifican contraste en oscuro) |

- El fondo oscuro es **verde carbón cálido**, nunca gris puro ni negro puro.
- Sombras clay en oscuro: reducir opacidad a 0.35 o sustituir por borde `#333D3A`.

---

## 8. Fuentes tipográficas — implementación (Expo)

```bash
npx expo install expo-font
npx expo install @expo-google-fonts/fraunces @expo-google-fonts/nunito-sans @expo-google-fonts/jetbrains-mono
```

```ts
// App.tsx
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
```

---

## 9. Checklist de revisión de UI

Antes de dar por terminada cualquier pantalla:

- [ ] Fondo crema `#FAF6F0` (no blanco puro)
- [ ] Títulos en Fraunces; cuerpo en Nunito Sans; **datos de gym en JetBrains Mono**
- [ ] Secciones etiquetadas con kicker editorial (mayúsculas + tracking)
- [ ] Toda superficie elevada tiene sombra clay
- [ ] Terracota solo aparece en contexto de gimnasio
- [ ] Ámbar solo en logros/rachas/foco
- [ ] Máximo 1 botón primario visible
- [ ] Controles táctiles ≥ 44×44
- [ ] Focus accesible visible
- [ ] Transiciones con easing suave (nada lineal)
- [ ] Empty states con blob orgánico, no fríos
