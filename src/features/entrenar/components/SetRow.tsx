import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, Button } from '@/ui';
import type { LiveSet } from '@/state/useSessionStore';

interface SetRowProps {
  set: LiveSet;
  onComplete: () => void;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
  onRpe: (r: number) => void;
}

export function SetRow({ set, onComplete, onWeight, onReps, onRpe }: SetRowProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        opacity: set.isCompleted ? 0.55 : 1,
      }}
    >
      {/* Fila principal: número de serie + estado */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={[typeScale.bodySm, { fontWeight: '700', color: theme.text }]}>
          {`Serie ${set.setNumber}`}
        </Text>
        {set.isCompleted ? (
          set.isPr ? <Badge variant="pr">🏆 PR</Badge> : <Badge variant="habit">✓ Hecha</Badge>
        ) : (
          <Button label="✓ Completar" onPress={onComplete} style={{ height: 36, paddingHorizontal: 14 }} accessibilityLabel={`Completar serie ${set.setNumber}`} />
        )}
      </View>

      {/* Controles: peso, reps, RPE */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
        {/* Peso */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, fontSize: 10 }]}>KG</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Button label="−" onPress={() => onWeight(Math.max(0, set.weight - 1))} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel={`Restar 1 kilo. Peso actual ${set.weight} kilos`} />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 13, color: theme.text, minWidth: 42, textAlign: 'center' }} accessibilityLabel={`${set.weight} kilos`}>
              {set.weight.toFixed(1)}
            </Text>
            <Button label="＋" onPress={() => onWeight(set.weight + 1)} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel={`Añadir 1 kilo. Peso actual ${set.weight} kilos`} />
          </View>
        </View>

        {/* Reps */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, fontSize: 10 }]}>REPS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Button label="−" onPress={() => onReps(Math.max(0, set.reps - 1))} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel={`Restar repetición. Actual ${set.reps} reps`} />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 13, color: theme.text, minWidth: 28, textAlign: 'center' }}>
              {set.reps}
            </Text>
            <Button label="＋" onPress={() => onReps(set.reps + 1)} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel={`Añadir repetición. Actual ${set.reps} reps`} />
          </View>
        </View>

        {/* RPE */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, fontSize: 10 }]}>RPE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Button label="−" onPress={() => onRpe(Math.max(1, (set.rpe ?? 7) - 1))} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel="menos RPE" />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 13, color: theme.text, minWidth: 20, textAlign: 'center' }}>
              {set.rpe ?? '—'}
            </Text>
            <Button label="＋" onPress={() => onRpe(Math.min(10, (set.rpe ?? 7) + 1))} style={{ width: 28, height: 28, paddingHorizontal: 0 }} accessibilityLabel="más RPE" />
          </View>
        </View>
      </View>
    </View>
  );
}
