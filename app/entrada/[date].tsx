import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import {
  Badge,
  Button,
  Card,
  Kicker,
  ScaleSelector,
  Sheet,
  Toast,
  EmptyState,
} from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { MultimediaSection } from '@/features/diario/components/MultimediaSection';
import { toAppError, type AppError } from '@/core/errors';
import type { DiaryEntry } from '@/core/types';
import { longDate } from '@/utils/dates';

/**
 * Editor de entrada — BLUEPRINTS §3 · 3 modos (Libre/Guiado/Rápido) · 4 estados.
 * Auto-guardado con debounce. HU-01 · HU-05 · HU-14.
 */

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const;

const TEMPLATES: Record<string, string[]> = {
  'Cierre del día': ['¿Cuál fue mi mejor momento?', '¿Qué aprendí hoy?', '¿Qué haría distinto?'],
  'Morning Pages': ['¿Qué siento ahora mismo?', '¿Qué quiero para hoy?', '¿Qué suelto?'],
  'Desahogo': ['¿Qué me está pesando? Escríbelo sin filtro.'],
  'Una línea al día': ['Resume tu día en una sola frase.'],
};

export default function EntradaScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [gratitudes, setGratitudes] = useState<string[]>([]);
  const [newGratitude, setNewGratitude] = useState('');
  const [sleep, setSleep] = useState('');
  const [weight, setWeight] = useState('');
  const [template, setTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const e = await diaryRepository.getEntryByDate(date);
      setEntry(e);
      setNotes(e?.notes ?? '');
      setSleep(e?.sleepHours != null ? String(e.sleepHours) : '');
      setWeight(e?.bodyWeight != null ? String(e.bodyWeight) : '');
      if (e) setGratitudes((await diaryRepository.getGratitudes(e.id)).map((g) => g.text));
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveMood = async (level: number) => {
    try {
      const e = await diaryRepository.upsertEntry({ mood: level as 1 | 2 | 3 | 4 | 5 }, date!);
      setEntry(e);
    } catch {
      setToast({ message: 'No se pudo guardar el ánimo', status: 'error' });
    }
  };

  const saveEnergy = async (level: number) => {
    try {
      const e = await diaryRepository.upsertEntry({ energy: level as 1 | 2 | 3 | 4 | 5 }, date!);
      setEntry(e);
    } catch {
      setToast({ message: 'No se pudo guardar la energía', status: 'error' });
    }
  };

  const saveNotes = async (text: string) => {
    try {
      const e = await diaryRepository.upsertEntry({ notes: text }, date!);
      setEntry(e);
      await diaryRepository.syncTagsFromNotes(e.id, text);
      setToast({ message: '✓ Guardado', status: 'success' });
    } catch {
      setToast({ message: 'No se pudo guardar (VALIDATION)', status: 'error' });
    }
  };

  const saveSleep = async (text: string) => {
    setSleep(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v >= 0 && v <= 24) {
      try {
        const e = await diaryRepository.upsertEntry({ sleepHours: v }, date!);
        setEntry(e);
      } catch { /* validación en Zod */ }
    }
  };

  const saveWeight = async (text: string) => {
    setWeight(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v > 0) {
      try {
        const e = await diaryRepository.upsertEntry({ bodyWeight: v }, date!);
        setEntry(e);
      } catch { /* validación en Zod */ }
    }
  };

  const addGratitude = async () => {
    if (!entry || !newGratitude.trim()) return;
    try {
      await diaryRepository.addGratitude(entry.id, newGratitude.trim());
      setNewGratitude('');
      setGratitudes((await diaryRepository.getGratitudes(entry.id)).map((g) => g.text));
      setToast({ message: '🙏 Gratitud añadida', status: 'success' });
    } catch (err) {
      const appErr = toAppError(err);
      setToast({
        message: appErr.code === 'CONFLICT' ? 'El día ya está lleno de cosas buenas' : 'Máx. 500 caracteres',
        status: 'error',
      });
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Abriendo tu cuaderno…" message="Un instante mientras cargamos tu día." />
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState
          icon="⚠️"
          title="No pudimos abrir esta entrada"
          message={`Error (${error.code}). Tus datos están seguros.`}
          actionLabel="Reintentar"
          onAction={load}
          secondaryLabel="Volver"
          onSecondary={() => router.back()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Kicker>{longDate(date ?? '').toUpperCase()}</Kicker>
            <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu día</Text>
          </View>
          <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
        </View>

        {/* Ánimo + Energía */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>ÁNIMO</Kicker>
          <ScaleSelector options={MOOD_EMOJIS} value={entry?.mood ?? null} onChange={saveMood} label="Ánimo" />
          <Kicker style={{ marginTop: 18, marginBottom: 10 }}>ENERGÍA</Kicker>
          <ScaleSelector options={['1', '2', '3', '4', '5']} value={entry?.energy ?? null} onChange={saveEnergy} label="Energía" />
        </Card>

        {/* Notas con plantillas */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Kicker>NOTAS</Kicker>
            <Button label="Plantillas" variant="ghost" onPress={() => setShowTemplates(true)} style={{ height: 36 }} />
          </View>
          {template && TEMPLATES[template] && (
            <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 10 }}>
              {TEMPLATES[template]!.map((q, i) => (
                <Text key={i} style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>
                  {i + 1}. {q}
                </Text>
              ))}
            </View>
          )}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={() => saveNotes(notes)}
            multiline
            placeholder="Hoy me siento…"
            placeholderTextColor={theme.textMuted}
            style={{
              minHeight: 120,
              backgroundColor: theme.field,
              borderRadius: radius.md,
              padding: 14,
              fontFamily: 'NunitoSans_400Regular',
              fontSize: 15,
              color: theme.text,
              textAlignVertical: 'top',
            }}
          />
          <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 6 }]}>
            Usa #etiquetas para organizar · se guarda al salir del campo
          </Text>
        </Card>

        {/* Gratitud */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>{`GRATITUD (${gratitudes.length}/5)`}</Kicker>
          {gratitudes.map((g, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 14 }}>🙏</Text>
              <Text style={[typeScale.bodySm, { color: theme.text, flex: 1 }]}>{g}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={newGratitude}
              onChangeText={setNewGratitude}
              placeholder="Una cosa buena de hoy…"
              placeholderTextColor={theme.textMuted}
              style={{
                flex: 1,
                backgroundColor: theme.field,
                borderRadius: radius.md,
                paddingHorizontal: 14,
                height: 46,
                fontFamily: 'NunitoSans_400Regular',
                fontSize: 14,
                color: theme.text,
              }}
            />
            <Button label="＋" onPress={addGratitude} style={{ width: 46, height: 46, paddingHorizontal: 0 }} />
          </View>
        </Card>

        {/* Multimedia: fotos, voz, sketch */}
        <MultimediaSection entryId={entry?.id ?? null} />

        {/* Cuerpo: sueño y peso */}
        <Card>
          <Kicker style={{ marginBottom: 10 }}>CUERPO</Kicker>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>😴 Sueño (horas)</Text>
              <TextInput
                value={sleep}
                onChangeText={saveSleep}
                keyboardType="decimal-pad"
                placeholder="7.5"
                placeholderTextColor={theme.textMuted}
                style={{
                  backgroundColor: theme.field,
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  height: 46,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>⚖️ Peso (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={saveWeight}
                keyboardType="decimal-pad"
                placeholder="70.5"
                placeholderTextColor={theme.textMuted}
                style={{
                  backgroundColor: theme.field,
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  height: 46,
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Sheet de plantillas */}
      <Sheet visible={showTemplates} title="Plantillas guiadas" onClose={() => setShowTemplates(false)}>
        {Object.keys(TEMPLATES).map((t) => (
          <Button
            key={t}
            label={t}
            variant={template === t ? 'primary' : 'ghost'}
            onPress={() => {
              setTemplate(t);
              setShowTemplates(false);
            }}
            style={{ marginBottom: 10 }}
          />
        ))}
        {template && (
          <Button label="Quitar plantilla" variant="ghost" onPress={() => setTemplate(null)} />
        )}
      </Sheet>

      <Toast
        message={toast?.message ?? ''}
        status={toast?.status ?? 'success'}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </KeyboardAvoidingView>
  );
}
