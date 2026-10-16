import React, { useEffect } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, shadows, motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * ScaleSelector — manual-identidad-visual.md §4.7 (componente insignia)
 * 5 botones circulares de 48px para ánimo/energía/RPE.
 * Seleccionado: escala 1.18 + fondo primarySoft + sombra clay + pop spring.
 * Accesibilidad: anuncia "Ánimo, 3 de 5" (accessibilityRole radio).
 */

interface ScaleSelectorProps {
  options: readonly string[];
  value: number | null;
  onChange: (index: number) => void;
  label: string;
  selectedColor?: string;
}

function ScaleButton({
  emoji,
  selected,
  onPress,
  label,
  index,
  selectedColor,
}: {
  emoji: string;
  selected: boolean;
  onPress: () => void;
  label: string;
  index: number;
  selectedColor: string;
}) {
  const scale = useSharedValue(selected ? 1.18 : 1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.18 : 1, motion.spring);
  }, [selected, scale]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${index + 1} de 5`}
      onPress={() => {
        scale.value = withSpring(1.3, { ...motion.spring, damping: 10 });
        onPress();
      }}
      style={[
        styles.btn,
        selected && { backgroundColor: selectedColor },
        selected && shadows.clayButton,
        aStyle,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
    </AnimatedPressable>
  );
}

export function ScaleSelector({
  options,
  value,
  onChange,
  label,
  selectedColor = palette.primarySoft,
}: ScaleSelectorProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((opt, i) => (
        <ScaleButton
          key={i}
          emoji={opt}
          index={i}
          label={label}
          selected={value === i + 1}
          selectedColor={selectedColor}
          onPress={() => onChange(i + 1)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: '#F4EFE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
});
