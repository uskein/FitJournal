import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import type { HabitWithState } from '../hooks/useToday';

/**
 * HabitsRow — HU-10 · BLUEPRINTS §1
 * Chips de hábito: hecho = pill salvia con ✓; pendiente = borde.
 * La racha 🔥 se muestra en el chip del hábito (Badge streak se usa en Progreso).
 */

interface HabitsRowProps {
  habits: HabitWithState[];
  onToggle: (habitId: number) => void;
}

export function HabitsRow({ habits, onToggle }: HabitsRowProps) {
  const theme = useTheme();

  if (habits.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.textMuted }]}>
        Sin hábitos todavía — añádelos desde Ajustes
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      {habits.map(({ habit, doneToday, streak }) => (
        <Pressable
          key={habit.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: doneToday }}
          accessibilityLabel={`${habit.name}${streak > 0 ? `, racha de ${streak} días` : ''}`}
          onPress={() => onToggle(habit.id)}
          style={[
            styles.chip,
            {
              backgroundColor: doneToday ? theme.primarySoft : 'transparent',
              borderColor: doneToday ? theme.primarySoft : theme.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: doneToday ? theme.primary : theme.textMuted }]}>
            {doneToday ? '✅' : '⬜'} {habit.name}
            {streak > 1 && <Text style={[styles.streak, { color: '#8A5B14' }]}>  🔥{streak}</Text>}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
  },
  streak: {
    fontFamily: fonts.dataMedium,
    fontSize: 11,
  },
  empty: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
  },
});
