import React from 'react';
import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/**
 * Badge — manual-identidad-visual.md §4.9
 * habit (salvia) | pr (terracota, gimnasio) | streak (ámbar, logros) | tag (borde)
 * Radio pill, padding 6/14, texto 12 Bold. SIN sombra clay (es flat).
 */

export type BadgeVariant = 'habit' | 'pr' | 'streak' | 'tag';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ children, variant = 'tag', style }: BadgeProps) {
  const theme = useTheme();

  const paletteByVariant: Record<BadgeVariant, { bg: string; fg: string; border?: string }> = {
    habit: { bg: theme.primarySoft, fg: theme.primary },
    pr: { bg: theme.secondarySoft, fg: '#8F4E33' },
    streak: { bg: theme.accentSoft, fg: '#8A5B14' },
    tag: { bg: 'transparent', fg: theme.textMuted, border: theme.border },
  };

  const c = paletteByVariant[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, borderColor: c.border ?? 'transparent' },
        style,
      ]}
    >
      <Text style={[styles.text, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
