/**
 * Design Tokens — FitJournal
 * Fuente de verdad: Artefactos/documentacion/Diseño Visual/manual-identidad-visual.md
 * Estilo: «Warm Clay Editorial»
 * PROHIBIDO usar colores, radios o espaciados fuera de este archivo.
 */

export const palette = {
  /** Primary — acciones, links, foco */
  primary: '#3E6B60',
  primaryPressed: '#335A50',
  primarySoft: '#DCE9E4',

  /** Secondary — EXCLUSIVO de contexto de gimnasio */
  secondary: '#C67B5C',
  secondaryPressed: '#B06A4D',
  secondarySoft: '#F3E1D8',
  secondaryBadgeText: '#8F4E33',

  /** Accent — SOLO logros, rachas y anillo de foco accesible */
  accent: '#E0A458',
  accentSoft: '#FCEFD9',
  accentBadgeText: '#8A5B14',

  /** Superficies */
  surface: '#FAF6F0',
  elevated: '#FFFFFF',
  field: '#F4EFE8',
  border: '#E8E0D6',

  /** Texto */
  text: '#2B2B2B',
  textMuted: '#6E6A65',
  textInverse: '#FFFFFF',

  /** Estados */
  success: '#4E8C6A',
  error: '#C0504D',
  warning: '#E0A458',

  /** Disabled */
  disabledBg: '#DCE9E4',
  disabledText: '#A8A29A',

  /** Modo oscuro — verde carbón cálido (nunca gris puro) */
  darkSurface: '#1B201E',
  darkElevated: '#242B29',
  darkText: '#EDE8E1',
  darkMuted: '#9FB8B0',
  darkBorder: '#333D3A',
} as const;

/** Paleta CERRADA del mood color map (no inventar colores fuera de esta lista) */
export const moodColors = [
  '#4E8C6A', // muy bien
  '#3E6B60', // bien
  '#E0A458', // neutral
  '#C67B5C', // bajo
  '#C0504D', // mal
  '#7A6FB0', // ansioso
  '#5B8FA8', // cansado
] as const;

export type MoodColor = (typeof moodColors)[number];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Sombras clay — obligatorias en superficies elevadas */
export const shadows = {
  /** Cards, sheets, superficies alzadas */
  clay: {
    shadowColor: palette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  /** Botones primarios (salvia) */
  clayButton: {
    shadowColor: palette.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  /** Botones gym (terracota) */
  clayButtonGym: {
    shadowColor: palette.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

/** Tiempos y curvas — física de goma suave (nada lineal) */
export const motion = {
  spring: { damping: 14, stiffness: 220, mass: 0.7 },
  screen: 250,
  accordion: 200,
  toastIn: 300,
  toastOut: 200,
} as const;

export const zIndex = {
  base: 0,
  card: 1,
  header: 10,
  tabbar: 20,
  sheet: 50,
  modal: 60,
  toast: 90,
} as const;

export const tokens = {
  palette,
  moodColors,
  spacing,
  radius,
  shadows,
  motion,
  zIndex,
} as const;

export type Tokens = typeof tokens;
