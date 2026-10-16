import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, BigData, Button, Stepper } from '@/ui';
import type { LiveSet } from '@/state/useSessionStore';

/**
 * SetRow — BLUEPRINTS §4 · HU-02
 * Fila de serie: stepper ±2.5kg (mono) + reps + RPE + completar (check spring).
 * Persistencia incremental al completar (regla 2).
 */

interface SetRowProps {
  set: LiveSet;
  onComplete: () => void;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
}

export function SetRow({ set, onComplete, onWeight, onReps }: SetRowProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        opacity: set.isCompleted ? 0.55 : 1,
      }}
    >
      <Text style={[typeScale.caption, { color: theme.textMuted, width: 52 }]}>
        {`Serie ${set.setNumber}`}
      </Text>

      <Stepper
        value={set.weight}
        step={2.5}
        onChange={onWeight}
        format={(v) => `${v.toFixed(1)}`}
        accessibilityLabel="peso"
      />

      <Stepper
        value={set.reps}
        step={1}
        onChange={onReps}
        format={(v) => `${Math.round(v)} reps`}
        min={0}
        accessibilityLabel="repeticiones"
      />

      {set.isCompleted ? (
        set.isPr ? (
          <Badge variant="pr">🏆 PR</Badge>
        ) : (
          <Badge variant="habit">✓</Badge>
        )
      ) : (
        <Button label="✓" onPress={onComplete} style={{ width: 44, height: 44, paddingHorizontal: 0 }} accessibilityLabel={`Completar serie ${set.setNumber}`} />
      )}
    </View>
  );
}
