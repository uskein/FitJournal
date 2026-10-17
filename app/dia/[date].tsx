import React, { useCallback, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { getDatabase } from '@/core/db/database';
import { pdfService } from '@/services/pdfService';
import type { DiaryEntry, Photo } from '@/core/types';
import { longDate } from '@/utils/dates';

const MOOD_COLORS = ['#C0504D', '#C67B5C', '#E0A458', '#3E6B60', '#4E8C6A'];

interface DayData {
  entry: DiaryEntry | null;
  gratitudes: string[];
  photos: Photo[];
  audios: Array<{ id: number; durationS: number | null }>;
  sketches: Array<{ id: number; strokes: { d: string[]; colors: string[]; widths: number[] } }>;
  workout: { exercises: string[]; sets: number; duration: number | null } | null;
  metrics: Array<{ metric: string; value: number | null; unit: string | null }>;
}

export default function DiaLecturaScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'social' | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const entry = await diaryRepository.getEntryByDate(date);
      const db = await getDatabase();

      const gratitudeRows = entry
        ? await db.getAllAsync<{ text: string }>('SELECT text FROM gratitude_items WHERE entry_id = ? ORDER BY created_at', [entry.id])
        : [];

      const photoRows = entry
        ? await db.getAllAsync<{ id: number; file_path: string; thumb_path: string | null }>(
            "SELECT id, file_path, thumb_path FROM photos WHERE owner_type = 'diary' AND owner_id = ?", [entry.id])
        : [];

      const audioRows = entry
        ? await db.getAllAsync<{ id: number; duration_s: number | null }>(
            'SELECT id, duration_s FROM audio_notes WHERE entry_id = ?', [entry.id])
        : [];

      const sketchRows = entry
        ? await db.getAllAsync<{ id: number; strokes: string }>(
            'SELECT id, strokes FROM sketches WHERE entry_id = ?', [entry.id])
        : [];

      const metricRows = entry
        ? await db.getAllAsync<{ metric: string; value: number | null; unit: string | null }>(
            'SELECT metric, value, unit FROM wellness_metrics WHERE entry_id = ?', [entry.id])
        : [];

      const session = await db.getFirstAsync<{ id: number; duration_min: number | null }>(
        'SELECT id, duration_min FROM workout_sessions WHERE session_date = ? AND finished_at IS NOT NULL', [date]);
      let workout: DayData['workout'] = null;
      if (session) {
        const exercises = await db.getAllAsync<{ name: string }>(
          `SELECT e.name FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`, [session.id]);
        const sets = await db.getFirstAsync<{ n: number }>(
          `SELECT COUNT(*) AS n FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id WHERE se.session_id = ? AND ss.is_completed = 1`, [session.id]);
        workout = { exercises: exercises.map(e => e.name), sets: sets?.n ?? 0, duration: session.duration_min };
      }

      setData({
        entry,
        gratitudes: gratitudeRows.map(r => r.text),
        photos: photoRows.map(r => ({ id: r.id, ownerType: 'diary' as const, ownerId: 0, filePath: r.file_path, thumbPath: r.thumb_path, width: null, height: null, createdAt: '' })),
        audios: audioRows.map(r => ({ id: r.id, durationS: r.duration_s })),
        sketches: sketchRows.map(r => ({ id: r.id, strokes: JSON.parse(r.strokes) })),
        workout,
        metrics: metricRows,
      });
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, [date]);

  React.useEffect(() => { load(); }, [load]);

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      const uri = await pdfService.exportDay(date!);
      await pdfService.share(uri);
    } catch { /* error manejado por sistema */ }
    finally { setExporting(null); }
  };

  const exportSocial = async () => {
    setExporting('social');
    try {
      const uri = await pdfService.exportSocialImage({
        title: longDate(date!),
        subtitle: 'Mi día en FitJournal',
        stats: [
          { value: data?.entry?.mood ? `${data.entry.mood}/5` : '—', label: 'Ánimo', color: '#3E6B60' },
          { value: data?.entry?.energy ? `${data.entry.energy}/5` : '—', label: 'Energía', color: '#E0A458' },
          { value: data?.workout ? `${data.workout.exercises.length}` : '—', label: 'Ejercicios', color: '#C67B5C' },
        ],
        footer: '@fitjournal',
      });
      await pdfService.shareSocial(uri);
    } catch { /* error manejado por sistema */ }
    finally { setExporting(null); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Cargando día…" message="Un instante." />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⚠️" title="Día no encontrado" message="No hay datos para esta fecha." actionLabel="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  const { entry, gratitudes, photos, audios, sketches, workout, metrics } = data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Kicker>DÍA (SOLO LECTURA)</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>{longDate(date!)}</Text>
          {entry?.isClosed && <Badge variant="habit" style={{ marginTop: 6 }}>🔒 Día cerrado</Badge>}
        </View>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      {/* Estado del día */}
      {entry && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>ESTADO DEL DÍA</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {entry.mood && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: MOOD_COLORS[entry.mood - 1], alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>{entry.mood >= 4 ? '😄' : entry.mood >= 3 ? '🙂' : '😐'}</Text>
                </View>
                <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 4 }]}>{`Ánimo ${entry.mood}/5`}</Text>
              </View>
            )}
            {entry.energy && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                </View>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>{`Energía ${entry.energy}/5`}</Text>
              </View>
            )}
            {entry.sleepHours != null && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E9F5', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>😴</Text>
                </View>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>{`${entry.sleepHours}h`}</Text>
              </View>
            )}
            {entry.sleepQuality && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E4E9F5', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>🌙</Text>
                </View>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>{`Calidad ${entry.sleepQuality}/5`}</Text>
              </View>
            )}
            {entry.bodyWeight != null && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>⚖️</Text>
                </View>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>{`${entry.bodyWeight}kg`}</Text>
              </View>
            )}
            {entry.weatherIcon && (
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>{entry.weatherIcon}</Text>
                </View>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>Clima</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Notas */}
      {entry?.notes && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>NOTAS</Kicker>
          <Text style={[typeScale.bodySm, { color: theme.text, lineHeight: 22 }]}>{entry.notes}</Text>
        </Card>
      )}

      {/* Gratitud */}
      {gratitudes.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>🙏 GRATITUD</Kicker>
          {gratitudes.map((g, i) => (
            <Text key={i} style={[typeScale.bodySm, { color: theme.text, marginBottom: 4 }]}>• {g}</Text>
          ))}
        </Card>
      )}

      {/* Métricas de bienestar */}
      {metrics.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>📊 BIENESTAR</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {metrics.map((m, i) => (
              <View key={i} style={{ backgroundColor: theme.field, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>{m.metric}</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 16, color: theme.primary }}>{m.value != null ? `${m.value}${m.unit ?? ''}` : '—'}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Fotos */}
      {photos.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ marginBottom: 8 }}><Kicker>{`🖼️ FOTOS (${photos.length})`}</Kicker></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {photos.map(p => (
                <Image key={p.id} source={{ uri: p.thumbPath ?? p.filePath }} style={{ width: 80, height: 80, borderRadius: radius.md }} />
              ))}
            </View>
          </ScrollView>
        </Card>
      )}

      {/* Audios */}
      {audios.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ marginBottom: 8 }}><Kicker>{`🎙️ AUDIOS (${audios.length})`}</Kicker></View>
          {audios.map(a => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 16 }}>▶️</Text>
              <Text style={[typeScale.bodySm, { color: theme.textMuted }]}>{`Nota de voz (${a.durationS ?? 0}s)`}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Sketches */}
      {sketches.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ marginBottom: 8 }}><Kicker>{`✍️ SKETCHES (${sketches.length})`}</Kicker></View>
          {sketches.map(sk => (
            <View key={sk.id} style={{ backgroundColor: '#fff', borderRadius: radius.md, padding: 10, height: 80, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
              <Svg width="100%" height="100%" viewBox="0 0 300 60">
                {(sk.strokes.d ?? []).filter(d => d && d.length > 0).map((d, i) => (
                  <Path key={i} d={d} stroke={(sk.strokes.colors ?? [])[i] ?? '#2B2B2B'} strokeWidth={(sk.strokes.widths ?? [])[i] ?? 2} fill="none" strokeLinecap="round" />
                ))}
              </Svg>
            </View>
          ))}
        </Card>
      )}

      {/* Entrenamiento */}
      {workout && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker variant="gym" style={{ marginBottom: 8 }}>🏋️ ENTRENAMIENTO</Kicker>
          <Text style={[typeScale.bodySm, { color: theme.text, marginBottom: 6 }]}>{`${workout.duration ?? '?'} min · ${workout.exercises.length} ejercicios · ${workout.sets} series`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {workout.exercises.map((e, i) => <Badge key={i} variant="pr">{e}</Badge>)}
          </View>
        </Card>
      )}

      {/* Export */}
      <Card style={{ marginTop: 6 }}>
        <Kicker style={{ marginBottom: 10 }}>📤 EXPORTAR ESTE DÍA</Kicker>
        <Button label="📄 Exportar a PDF" onPress={exportPdf} disabled={exporting !== null} style={{ marginBottom: 10 }} />
        <Button label="📱 Exportar para redes sociales" variant="gym" onPress={exportSocial} disabled={exporting !== null} />
      </Card>
    </ScrollView>
  );
}
