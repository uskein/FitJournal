import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius } from '@/theme/tokens';

/**
 * Stepper — manual-identidad-visual.md §4.8
 * ± con valor central en JetBrains Mono Bold 20 (los números siempre en mono).
 * Step por defecto 2.5 kg (ajustable para reps: step 1).
 */

interface StepperProps {
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  accessibilityLabel: string;
}

export function Stepper({
  value,
  step = 2.5,
  onChange,
  format = (v) => `${v.toFixed(1)} kg`,
  min = 0,
  max,
  accessibilityLabel,
}: StepperProps) {
  const theme = useTheme();
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(max !== undefined ? Math.min(max, +(value + step).toFixed(2)) : +(value + step).toFixed(2));

  return (
    <View style={[styles.wrap, { backgroundColor: theme.field }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Disminuir ${accessibilityLabel}`}
        onPress={dec}
        style={[styles.btn, { backgroundColor: theme.primarySoft }]}
      >
        <Text style={[styles.sign, { color: theme.primary }]}>−</Text>
      </Pressable>
      <Text style={[styles.value, { color: theme.text }]}>{format(value)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Aumentar ${accessibilityLabel}`}
        onPress={inc}
        style={[styles.btn, { backgroundColor: theme.primarySoft }]}
      >
        <Text style={[styles.sign, { color: theme.primary }]}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: 8,
    gap: 12,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sign: {
    fontSize: 20,
    fontWeight: '700',
  },
  value: {
    fontFamily: fonts.dataBold,
    fontSize: 20,
    minWidth: 84,
    textAlign: 'center',
  },
});
