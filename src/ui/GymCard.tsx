import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, shadows } from '@/theme/tokens';

/**
 * GymCard — manual-identidad-visual.md §4.5 · fusión editorial
 * Barra terracota 6px superior + datos en JetBrains Mono (BigData).
 * EXCLUSIVA de contexto de gimnasio (la terracota nunca sale de aquí).
 */

interface GymCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GymCard({ children, style }: GymCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.topBar, { backgroundColor: palette.secondary }]} />
      <View style={[styles.card, shadows.clay, { backgroundColor: theme.elevated, borderColor: theme.mode === 'dark' ? theme.border : 'transparent' }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  topBar: {
    height: 6,
    width: '100%',
  },
  card: {
    borderRadius: radius.xl,
    marginTop: -6,
    paddingTop: 26,
    padding: 20,
    borderWidth: 1,
  },
});
