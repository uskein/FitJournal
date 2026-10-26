import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, Kicker, ScaleSelector, Sheet, Toast } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { MultimediaSection } from '@/features/diario/components/MultimediaSection';
import { hapticService } from '@/services/hapticService';
import { toAppError, type AppError } from '@/core/errors';
import type { DiaryEntry } from '@/core/types';
import { longDate } from '@/utils/dates';

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const;
const WEATHER_OPTIONS = [
  { icon: '☀️', label: 'Soleado' }, { icon: '⛅', label: 'Nublado' },
  { icon: '🌧️', label: 'Lluvioso' }, { icon: '❄️', label: 'Frío' },
  { icon: '🌪️', label: 'Tormenta' }, { icon: '🌫️', label: 'Niebla' },
];

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default function EntradaScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(date ?? '');
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [gratitudes, setGratitudes] = useState<string[]>([]);
  const [newGratitude, setNewGratitude] = useState('');
  const [sleep, setSleep] = useState('');
  const [sleepQ, setSleepQ] = useState<number | null>(null);
  const [weight, setWeight] = useState('');
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: number; name: string; questions: string[]; isBuiltin: boolean }>>([]);
  const [showTplCreator, setShowTplCreator] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplQuestions, setTplQuestions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: string) => {
    if (!d) return;
    setLoading(true);
    setError(null);
    try {
      const e = await diaryRepository.getEntryByDate(d);
      setEntry(e);
      setNotes(e?.notes ?? '');
      setSleep(e?.sleepHours != null ? String(e.sleepHours) : '');
      setSleepQ(e?.sleepQuality ?? null);
      setWeight(e?.bodyWeight != null ? String(e.bodyWeight) : '');
      setWeatherIcon(e?.weatherIcon ?? null);
      if (e) setGratitudes((await diaryRepository.getGratitudes(e.id)).map((g) => g.text));
      else setGratitudes([]);
      setTemplates(await diaryRepository.listTemplates().catch(() => []));
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(currentDate); }, [currentDate, load]);

  // Cargar prompt aleatorio al abrir
  useEffect(() => {
    diaryRepository.getRandomPrompt().then(setPrompt).catch(() => {});
  }, []);

  const ensureEntry = async (): Promise<DiaryEntry | null> => {
    if (entry) return entry;
    return diaryRepository.upsertEntry({}, currentDate);
  };

  const saveMood = async (level: number) => {
    try {
      const e = await diaryRepository.upsertEntry({ mood: level as 1|2|3|4|5 }, currentDate);
      setEntry(e);
      hapticService.light();
    } catch { setToast({ message: 'No se pudo guardar', status: 'error' }); }
  };

  const saveEnergy = async (level: number) => {
    try {
      const e = await diaryRepository.upsertEntry({ energy: level as 1|2|3|4|5 }, currentDate);
      setEntry(e);
    } catch { setToast({ message: 'No se pudo guardar', status: 'error' }); }
  };

  const saveNotes = async (text: string) => {
    try {
      const e = await diaryRepository.upsertEntry({ notes: text }, currentDate);
      setEntry(e);
      await diaryRepository.syncTagsFromNotes(e.id, text);
      setToast({ message: '✓ Guardado', status: 'success' });
    } catch { setToast({ message: 'No se pudo guardar', status: 'error' }); }
  };

  const saveSleep = async (text: string) => {
    setSleep(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v >= 0 && v <= 24) {
      try { const e = await diaryRepository.upsertEntry({ sleepHours: v }, currentDate); setEntry(e); } catch { /* Zod */ }
    }
  };

  const saveSleepQ = async (level: number) => {
    setSleepQ(level);
    try { const e = await diaryRepository.upsertEntry({ sleepQuality: level as 1|2|3|4|5 }, currentDate); setEntry(e); hapticService.light(); } catch { /* Zod */ }
  };

  const saveWeight = async (text: string) => {
    setWeight(text);
    const v = parseFloat(text);
    if (!isNaN(v) && v > 0) {
      try { const e = await diaryRepository.upsertEntry({ bodyWeight: v }, currentDate); setEntry(e); } catch { /* Zod */ }
    }
  };

  const saveWeather = async (icon: string) => {
    setWeatherIcon(icon);
    try { const e = await diaryRepository.upsertEntry({ weather: icon, weatherIcon: icon }, currentDate); setEntry(e); } catch { /* Zod */ }
  };

  const addGratitude = async () => {
    const e = await ensureEntry();
    if (!e || !newGratitude.trim()) return;
    try {
      await diaryRepository.addGratitude(e.id, newGratitude.trim());
      setNewGratitude('');
      setGratitudes((await diaryRepository.getGratitudes(e.id)).map((g) => g.text));
      hapticService.success();
      setToast({ message: '🙏 Gratitud añadida', status: 'success' });
    } catch (err) {
      const appErr = toAppError(err);
      setToast({
        message: appErr.code === 'CONFLICT' ? 'El día ya está lleno de cosas buenas' : 'Máx. 500 caracteres',
        status: 'error',
      });
    }
  };

  const closeDay = async () => {
    try {
      await ensureEntry();
      await diaryRepository.closeDay(currentDate);
      hapticService.success();
      setToast({ message: '🔒 Día cerrado', status: 'success' });
      load(currentDate);
    } catch { setToast({ message: 'No se pudo cerrar', status: 'error' }); }
  };

  const reopenDay = async () => {
    try {
      const db = await import('@/core/db/database').then(m => m.getDatabase());
      await db.runAsync('UPDATE diary_entries SET is_closed = 0 WHERE entry_date = ?', [currentDate]);
      hapticService.light();
      setToast({ message: '🔓 Día reabierto', status: 'success' });
      load(currentDate);
    } catch { setToast({ message: 'No se pudo reabrir', status: 'error' }); }
  };

  const inspire = async () => {
    const p = await diaryRepository.getRandomPrompt();
    setPrompt(p);
    hapticService.light();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Abriendo tu cuaderno…" message="Un instante." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⚠️" title="No pudimos abrir esta entrada" message={`Error (${error.code}).`} actionLabel="Reintentar" onAction={() => load(currentDate)} secondaryLabel="Volver" onSecondary={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {/* Header con navegación entre días */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Button label="←" variant="ghost" onPress={() => { hapticService.light(); setCurrentDate(addDays(currentDate, -1)); }} style={{ width: 44, paddingHorizontal: 0 }} accessibilityLabel="Día anterior" />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Kicker>{longDate(currentDate).toUpperCase()}</Kicker>
            <Text style={[typeScale.h2, { color: theme.text, marginTop: 2 }]}>{entry?.isClosed ? '🔒 Día cerrado' : 'Tu día'}</Text>
          </View>
          <Button label="→" variant="ghost" onPress={() => { hapticService.light(); setCurrentDate(addDays(currentDate, 1)); }} style={{ width: 44, paddingHorizontal: 0 }} accessibilityLabel="Día siguiente" />
        </View>

        {/* Botón cerrar/reabrir día */}
        {entry && !entry.isClosed && (
          <Button label="🔒 Cerrar día" variant="ghost" onPress={closeDay} style={{ marginBottom: 10, height: 42 }} />
        )}
        {entry?.isClosed && (
          <View style={{ backgroundColor: theme.primarySoft, borderRadius: radius.md, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typeScale.bodySm, { color: theme.primary, fontWeight: '700' }]}>🔒 Día cerrado</Text>
            <Button label="🔓 Reabrir" variant="ghost" onPress={reopenDay} style={{ height: 36 }} />
          </View>
        )}

        {/* Export redes del día */}
        <Button
          label="📱 Exportar día para redes"
          variant="gym"
          onPress={async () => {
            try {
              const { pdfService } = await import('@/services/pdfService');
              const uri = await pdfService.exportSocialImage({
                title: longDate(currentDate),
                subtitle: 'Mi día en FitJournal',
                stats: [
                  { value: entry?.mood ? `${entry.mood}/5` : '—', label: 'Ánimo', color: '#3E6B60' },
                  { value: entry?.energy ? `${entry.energy}/5` : '—', label: 'Energía', color: '#E0A458' },
                  { value: entry?.sleepHours != null ? `${entry.sleepHours}h` : '—', label: 'Sueño', color: '#7A6FB0' },
                ],
                footer: '@fitjournal',
              });
              await pdfService.shareSocial(uri);
              setToast({ message: '📱 Imagen lista', status: 'success' });
            } catch (e) {
              setToast({ message: `Error: ${e instanceof Error ? e.message : 'No se pudo generar'}`, status: 'error' });
            }
          }}
          style={{ marginBottom: 14, height: 44 }}
        />

        {/* Ánimo + Energía */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>ÁNIMO</Kicker>
          <ScaleSelector options={MOOD_EMOJIS} value={entry?.mood ?? null} onChange={saveMood} label="Ánimo" />
          <Kicker style={{ marginTop: 16, marginBottom: 8 }}>ENERGÍA</Kicker>
          <ScaleSelector options={['1','2','3','4','5']} value={entry?.energy ?? null} onChange={saveEnergy} label="Energía" />
        </Card>

        {/* Cuerpo: sueño + calidad + peso */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>CUERPO</Kicker>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>😴 Horas de sueño</Text>
              <TextInput value={sleep} onChangeText={saveSleep} keyboardType="decimal-pad" placeholder="7.5" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 44, fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: theme.text }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>⚖️ Peso (kg)</Text>
              <TextInput value={weight} onChangeText={saveWeight} keyboardType="decimal-pad" placeholder="70.5" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 44, fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: theme.text }} />
            </View>
          </View>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>🌙 Calidad del sueño (1-5)</Text>
          <ScaleSelector options={['1','2','3','4','5']} value={sleepQ} onChange={saveSleepQ} label="Calidad del sueño" />
        </Card>

        {/* Clima */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>🌤️ CLIMA</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {WEATHER_OPTIONS.map(w => (
              <Pressable key={w.icon} onPress={() => saveWeather(w.icon)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: weatherIcon === w.icon ? theme.primarySoft : 'transparent', borderWidth: 1.5, borderColor: weatherIcon === w.icon ? theme.primary : theme.border }}>
                <Text style={{ fontSize: 14 }}>{w.icon}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Notas + prompt inspirador */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Kicker>NOTAS</Kicker>
            <Button label="💡 Inspírame" variant="ghost" onPress={inspire} style={{ height: 34 }} />
          </View>
          {prompt && (
            <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 10 }}>
              <Text style={[typeScale.caption, { color: theme.primary, fontStyle: 'italic' }]}>💡 {prompt}</Text>
            </View>
          )}
          <TextInput value={notes} onChangeText={setNotes} onBlur={() => saveNotes(notes)} multiline placeholder="Hoy me siento…" placeholderTextColor={theme.textMuted} style={{ minHeight: 110, backgroundColor: theme.field, borderRadius: radius.md, padding: 14, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, textAlignVertical: 'top' }} />
          <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 6 }]}>Usa #etiquetas · se guarda al salir del campo</Text>
        </Card>

        {/* Gratitud */}
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>{`GRATITUD (${gratitudes.length}/5)`}</Kicker>
          {gratitudes.map((g, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 14 }}>🙏</Text>
              <Text style={[typeScale.bodySm, { color: theme.text, flex: 1 }]}>{g}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={newGratitude} onChangeText={setNewGratitude} placeholder="Una cosa buena de hoy…" placeholderTextColor={theme.textMuted} style={{ flex: 1, backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text }} />
            <Button label="＋" onPress={addGratitude} style={{ width: 46, height: 46, paddingHorizontal: 0 }} />
          </View>
        </Card>

        {/* Multimedia */}
        <MultimediaSection entryId={entry?.id ?? null} />

        {/* Plantillas */}
        <Button label="📋 Plantillas guiadas" variant="ghost" onPress={() => setShowTemplates(true)} style={{ marginBottom: 14 }} />
      </ScrollView>

      {/* Sheet plantillas */}
      <Sheet visible={showTemplates} title="Plantillas guiadas" onClose={() => { setShowTemplates(false); setShowTplCreator(false); }}>
        {showTplCreator ? (
          /* Crear plantilla propia */
          <View>
            <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>NOMBRE DE LA PLANTILLA</Text>
            <TextInput value={tplName} onChangeText={setTplName} placeholder="Mi ritual de mañana" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 12 }} />
            <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>PREGUNTAS (una por línea)</Text>
            <TextInput value={tplQuestions} onChangeText={setTplQuestions} multiline placeholder="¿Qué quiero para hoy?&#10;¿Qué agradezco?" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 14, minHeight: 90, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, textAlignVertical: 'top', marginBottom: 14 }} />
            <Button
              label="💾 Guardar plantilla"
              onPress={async () => {
                const qs = tplQuestions.split('\n').map(q => q.trim()).filter(Boolean);
                if (!tplName.trim() || qs.length === 0) {
                  setToast({ message: 'Nombre y al menos una pregunta', status: 'error' });
                  return;
                }
                await diaryRepository.createTemplate(tplName.trim(), qs);
                setTemplates(await diaryRepository.listTemplates());
                setTplName(''); setTplQuestions(''); setShowTplCreator(false);
                hapticService.success();
                setToast({ message: '✓ Plantilla creada', status: 'success' });
              }}
              style={{ marginBottom: 10 }}
            />
            <Button label="← Volver a plantillas" variant="ghost" onPress={() => setShowTplCreator(false)} />
          </View>
        ) : (
          <View>
            {templates.map((t) => (
              <Pressable
                key={t.id}
                onLongPress={() => {
                  if (t.isBuiltin) return;
                  Alert.alert('¿Borrar plantilla?', `Se eliminará "${t.name}".`, [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Borrar', style: 'destructive',
                      onPress: async () => {
                        await diaryRepository.deleteTemplate(t.id);
                        setTemplates(await diaryRepository.listTemplates());
                        hapticService.light();
                      },
                    },
                  ]);
                }}
                onPress={() => { setTemplate(t.name); setShowTemplates(false); }}
                style={{ marginBottom: 8 }}
              >
                <View style={{ backgroundColor: template === t.name ? theme.primarySoft : theme.field, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: template === t.name ? theme.primary : 'transparent' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '700', flex: 1 }]} numberOfLines={1}>{t.name}</Text>
                    {!t.isBuiltin && <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>TUYA</Text>}
                  </View>
                  <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]} numberOfLines={1}>{t.questions[0] ?? ''}</Text>
                </View>
              </Pressable>
            ))}
            <Button label="➕ Crear mi plantilla" variant="ghost" onPress={() => setShowTplCreator(true)} style={{ marginTop: 6 }} />
            <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 8 }]}>Mantén pulsada una plantilla tuya para borrarla.</Text>
          </View>
        )}
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}
