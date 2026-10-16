import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/**
 * Skeleton — BLUEPRINTS §1 (estado Loading del Hoy)
 * Bloque esqueleto con shimmer suave (gradiente field→border). Fidelidad clay.
 */

interface SkeletonProps {
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ height = 96, style }: SkeletonProps) {
  const theme = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [shimmer]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + shimmer.value * 0.45,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { height, backgroundColor: theme.field, borderColor: theme.border }, aStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: 14,
  },
});
