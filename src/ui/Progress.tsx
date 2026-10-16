import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius } from '@/theme/tokens';

/**
 * Progress — manual-identidad-visual.md §4.11
 * Track border, fill gradiente primary→accent (salvia→ámbar), radio pill, altura 10.
 */

interface ProgressProps {
  /** 0..1 */
  progress: number;
}

export function Progress({ progress }: ProgressProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: theme.border }]} accessibilityRole="progressbar">
      <LinearGradient
        colors={[palette.primary, palette.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${pct * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
