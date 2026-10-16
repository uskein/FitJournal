import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, shadows } from '@/theme/tokens';

/**
 * MoodCard — manual-identidad-visual.md §4.5 · blueprints §1
 * Card del día (diario): gradiente suave del mood color (14% → elevado)
 * + barra de color pleno de 6px arriba (fusión editorial del mood map).
 * Solo se usa con colores de la paleta cerrada (tokens.moodColors).
 */

interface MoodCardProps {
  moodColor: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function MoodCard({ moodColor, children, style }: MoodCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.topBar, { backgroundColor: moodColor }]} />
      <LinearGradient
        colors={[`${moodColor}24`, theme.elevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadows.clay, { backgroundColor: theme.elevated }]}
      >
        {children}
      </LinearGradient>
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
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
