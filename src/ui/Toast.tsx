import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius, motion, zIndex } from '@/theme/tokens';

/**
 * Toast — manual-identidad-visual.md §4.10
 * Fondo #2B2B2B, texto blanco, radio 14, borde inferior 4px según estado.
 * Entra con spring desde abajo, sale con timing. Auto-ocurre a los 3s.
 * Códigos: success (verde) | error (rojo) | pr (terracota — PRs de gimnasio).
 */

export type ToastStatus = 'success' | 'error' | 'pr';

interface ToastProps {
  message: string;
  status?: ToastStatus;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

const BORDER: Record<ToastStatus, string> = {
  success: '#4E8C6A',
  error: '#C0504D',
  pr: '#C67B5C',
};

export function Toast({ message, status = 'success', visible, onDismiss, durationMs = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, motion.spring);
      opacity.value = withTiming(1, { duration: motion.toastIn });
      const t = setTimeout(onDismiss, durationMs);
      return () => clearTimeout(t);
    }
    translateY.value = withTiming(80, { duration: motion.toastOut });
    opacity.value = withTiming(0, { duration: motion.toastOut });
  }, [visible, durationMs, onDismiss, translateY, opacity]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.toast, { bottom: insets.bottom + 86, borderBottomColor: BORDER[status] }, aStyle]}
    >
      <Pressable onPress={onDismiss}>
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: zIndex.toast,
    backgroundColor: '#2B2B2B',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderBottomWidth: 4,
  },
  text: {
    fontFamily: fonts.bodySemi,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
