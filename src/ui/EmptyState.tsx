import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Button } from './Button';

/**
 * EmptyState — manual-identidad-visual.md §4.14 · §5 (movimiento morphing)
 * Blob orgánico que respira + título Fraunces + frase cálida + CTA.
 * Prohibido usar el símbolo ∅ frío ni ilustraciones ajenas al estilo.
 * Respeta prefers-reduced-motion (React Native expone accessibilityInfo —
 * aquí se limita la animación a un simple fade si no hay soporte de repeat).
 */

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const blobStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      borderRadius: 46 + p * 12,
      transform: [
        { scale: 1 + p * 0.04 },
        { rotateX: `${p * 6}deg` },
        { rotateY: `${-p * 6}deg` },
      ],
    };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.blob, blobStyle]}>
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>
      <Text style={[typeScale.h2, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[typeScale.body, { color: theme.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 22 }]}>
        {message}
      </Text>
      {actionLabel && <Button label={actionLabel} onPress={onAction} style={{ marginBottom: 10 }} />}
      {secondaryLabel && <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  blob: {
    width: 104,
    height: 98,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE9E4',
  },
  icon: {
    fontSize: 40,
  },
});
