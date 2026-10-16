import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';

/**
 * BigData — manual-identidad-visual.md §2.7 · fusión editorial
 * Número JetBrains Mono gigante para PRs, récords y rachas.
 * Tamaños: lg (34) · xl (48) · md (20) · sm (14)
 * El color del acento es responsabilidad del padre (el gimnasio usa terracota).
 */

interface BigDataProps {
  children: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  style?: StyleProp<TextStyle>;
}

const SIZES = {
  sm: typeScale.dataSm,
  md: typeScale.dataMd,
  lg: typeScale.dataLg,
  xl: typeScale.dataXl,
} as const;

export function BigData({ children, size = 'lg', color, style }: BigDataProps) {
  const theme = useTheme();
  return <Text style={[SIZES[size], { color: color ?? theme.text }, style]}>{children}</Text>;
}
