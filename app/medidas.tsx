import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Toast } from '@/ui';
import { bodyMeasurementService, type BodyMeasurement } from '@/services/bodyMeasurementService';
import { todayISO } from '@/utils/dates';

const FIELDS = [
  { key: 'weight', label: 'Peso (kg)', icon: '⚖️' },
  { key: 'chest', label: 'Pecho (cm)', icon: '🫁' },
  { key: 'waist', label: 'Cintura (cm)', icon: '📐' },
  { key: 'hips', label: 'Cadera (cm)', icon: '🍑' },
  { key: 'armRight', label: 'Brazo derecho (cm)', icon: '💪' },
  { key: 'thighRight', label: 'Muslo derecho (cm)', icon: '🦵' },
  { key: 'neck', label: 'Cuello (cm)', icon: '🗣️' },
] as const;

export default function MedidasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<BodyMeasurement[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setHistory(await bodyMeasurementService.list(20));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    try {
      const input: Record<string, number | null> = {};
      for (const f of FIELDS) {
        const v = parseFloat(values[f.key] ?? '');
        input[f.key] = isNaN(v) ? null : v;
      }
      await bodyMeasurementService.record(todayISO(), input);
      setValues({});
      setToast({ message: '✓ Medidas guardadas', status: 'success' });
      load();
    } catch {
      setToast({ message: 'No se pudieron guardar', status: 'error' });
    }
  };

  const latest = history[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <Kicker>MEDIDAS CORPORALES</Kicker>
      <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Tu cuerpo</Text>

      {/* Última medición */}
      {latest && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 8 }}>{`ÚLTIMA MEDICIÓN: ${latest.date}`}</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {latest.weight && <View><BigData size="md" color={theme.primary}>{`${latest.weight}kg`}</BigData><Text style={[typeScale.caption, { color: theme.textMuted }]}>Peso</Text></View>}
            {latest.waist && <View><BigData size="md" color={theme.secondary}>{`${latest.waist}cm`}</BigData><Text style={[typeScale.caption, { color: theme.textMuted }]}>Cintura</Text></View>}
            {latest.chest && <View><BigData size="md" color={theme.accent}>{`${latest.chest}cm`}</BigData><Text style={[typeScale.caption, { color: theme.textMuted }]}>Pecho</Text></View>}
          </View>
        </Card>
      )}

      {/* Input medidas */}
      <Card style={{ marginBottom: 16 }}>
        <Kicker style={{ marginBottom: 12 }}>NUEVA MEDICIÓN</Kicker>
        {FIELDS.map(f => (
          <View key={f.key} style={{ marginBottom: 10 }}>
            <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>{`${f.icon} ${f.label}`}</Text>
            <TextInput
              value={values[f.key] ?? ''}
              onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={theme.textMuted}
              style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 44, fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: theme.text }}
            />
          </View>
        ))}
        <Button label="Guardar medidas" onPress={save} style={{ marginTop: 8 }} />
      </Card>

      {/* Historial */}
      {history.length > 0 && (
        <Card>
          <Kicker style={{ marginBottom: 12 }}>HISTORIAL</Kicker>
          {history.map(m => (
            <View key={m.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={[typeScale.bodySm, { color: theme.textMuted }]}>{m.date}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {m.weight && <Text style={[typeScale.bodySm, { color: theme.primary, fontWeight: '600' }]}>{`${m.weight}kg`}</Text>}
                {m.waist && <Text style={[typeScale.bodySm, { color: theme.secondary, fontWeight: '600' }]}>{`${m.waist}cm`}</Text>}
                {m.chest && <Text style={[typeScale.bodySm, { color: theme.accent, fontWeight: '600' }]}>{`${m.chest}cm`}</Text>}
              </View>
            </View>
          ))}
        </Card>
      )}

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
