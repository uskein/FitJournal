import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palette } from './tokens';

/** Forma tipada del tema (light y dark comparten estructura) */
export interface AppTheme {
  readonly mode: 'light' | 'dark';
  readonly surface: string;
  readonly elevated: string;
  readonly field: string;
  readonly border: string;
  readonly text: string;
  readonly textMuted: string;
  readonly primary: string;
  readonly primarySoft: string;
  readonly secondary: string;
  readonly secondarySoft: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly success: string;
  readonly error: string;
}

/** Tema claro — tokens exactos del manual */
export const lightTheme: AppTheme = {
  mode: 'light',
  surface: palette.surface,
  elevated: palette.elevated,
  field: palette.field,
  border: palette.border,
  text: palette.text,
  textMuted: palette.textMuted,
  primary: palette.primary,
  primarySoft: palette.primarySoft,
  secondary: palette.secondary,
  secondarySoft: palette.secondarySoft,
  accent: palette.accent,
  accentSoft: palette.accentSoft,
  success: palette.success,
  error: palette.error,
};

/** Tema oscuro — verde carbón cálido (nunca gris puro) */
export const darkTheme: AppTheme = {
  mode: 'dark',
  surface: palette.darkSurface,
  elevated: palette.darkElevated,
  field: '#2A322F',
  border: palette.darkBorder,
  text: palette.darkText,
  textMuted: palette.darkMuted,
  primary: palette.primary,
  primarySoft: '#2E4A43',
  secondary: palette.secondary,
  secondarySoft: '#4A342B',
  accent: palette.accent,
  accentSoft: '#4A3A20',
  success: palette.success,
  error: palette.error,
};

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const resolved = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx.theme;
}

export function useThemeMode(): ThemeMode {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode debe usarse dentro de <ThemeProvider>');
  return ctx.mode;
}

export function useThemeProvider(): { setMode: (mode: ThemeMode) => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeProvider debe usarse dentro de <ThemeProvider>');
  return { setMode: ctx.setMode };
}
