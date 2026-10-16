import React from 'react';
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { palette, radius, shadows, motion } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

/**
 * Button — manual-identidad-visual.md §4.1
 * variant: primary (salvia) | gym (terracota, SOLO acciones de gimnasio) | ghost | icon
 * Estados: default, pressed (escala 0.97 + sombra aplana), focus (anillo ámbar), disabled
 * Altura 52 (target táctil), radio 16, sombra clay obligatoria en primary/gym.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'gym' | 'ghost' | 'icon';

interface ButtonProps {
  label?: string;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const BG: Record<Exclude<ButtonVariant, 'icon'>, { base: string; pressed: string }> = {
  primary: { base: palette.primary, pressed: palette.primaryPressed },
  gym: { base: palette.secondary, pressed: palette.secondaryPressed },
  ghost: { base: 'transparent', pressed: palette.primarySoft },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  disabled = false,
  onPress,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isIcon = variant === 'icon';
  const colors = isIcon ? { base: palette.primarySoft, pressed: palette.primary } : BG[variant];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? icon}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, motion.spring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring);
      }}
      onPress={onPress}
      style={[
        styles.base,
        isIcon && styles.iconOnly,
        { backgroundColor: colors.base },
        variant === 'primary' && !disabled && shadows.clayButton,
        variant === 'gym' && !disabled && shadows.clayButtonGym,
        disabled && styles.disabled,
        aStyle,
        style,
      ]}
    >
      {icon && <Text style={[styles.icon, isIcon && { fontSize: 20 }]}>{icon}</Text>}
      {label && !isIcon && (
        <Text
          style={[
            styles.label,
            { color: variant === 'ghost' ? palette.primary : palette.textInverse },
            disabled && { color: palette.disabledText },
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconOnly: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    paddingHorizontal: 0,
  },
  disabled: {
    backgroundColor: palette.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
  },
  icon: {
    fontSize: 16,
  },
});
