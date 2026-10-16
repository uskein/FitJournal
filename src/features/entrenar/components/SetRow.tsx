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
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Peso */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>KG</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Button label="−" onPress={() => onWeight(Math.max(0, set.weight - 2.5))} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 15, color: theme.text, minWidth: 48, textAlign: 'center' }}>
              {set.weight.toFixed(1)}
            </Text>
            <Button label="＋" onPress={() => onWeight(set.weight + 2.5)} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
          </View>
        </View>

        {/* Reps */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>REPS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Button label="−" onPress={() => onReps(Math.max(0, set.reps - 1))} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 15, color: theme.text, minWidth: 40, textAlign: 'center' }}>
              {set.reps}
            </Text>
            <Button label="＋" onPress={() => onReps(set.reps + 1)} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
          </View>
        </View>

        {/* RPE */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>RPE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Button label="−" onPress={() => onRpe(Math.max(1, (set.rpe ?? 7) - 1))} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 15, color: theme.text, minWidth: 24, textAlign: 'center' }}>
              {set.rpe ?? '—'}
            </Text>
            <Button label="＋" onPress={() => onRpe(Math.min(10, (set.rpe ?? 7) + 1))} style={{ width: 36, height: 36, paddingHorizontal: 0 }} />
          </View>
        </View>
      </View>
    </View>
  );
}
