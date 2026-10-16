import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadows } from '@/theme/tokens';

/**
 * Card — manual-identidad-visual.md §4.5
 * Superficie elevada: fondo elevated, radio 24, padding 20, sombra clay OBLIGATORIA.
 * No usar para badges ni elementos flat.
 */

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        shadows.clay,
        { backgroundColor: theme.elevated, borderColor: theme.mode === 'dark' ? theme.border : 'transparent' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
  },
});
