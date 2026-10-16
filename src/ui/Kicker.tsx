import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';

/**
 * Kicker — manual-identidad-visual.md §2.7 (fusión editorial)
 * Label de sección EN MAYÚSCULAS con tracking .18em.
 * Variante 'gym' usa terracota (solo en contexto de gimnasio).
 */

interface KickerProps {
  children: string;
  variant?: 'default' | 'gym';
  style?: StyleProp<TextStyle>;
}

export function Kicker({ children, variant = 'default', style }: KickerProps) {
  const theme = useTheme();
  const color = variant === 'gym' ? theme.secondary : theme.textMuted;
  return <Text style={[typeScale.kicker, { color }, style]}>{children}</Text>;
}
