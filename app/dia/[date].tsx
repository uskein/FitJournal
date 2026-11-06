import React, { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Toast } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { getDatabase } from '@/core/db/database';
import { pdfService } from '@/services/pdfService';
import { audioService } from '@/services/audioService';
import { PhotoViewerModal } from '@/features/diario/components/PhotoViewerModal';
import { SketchSvg } from '@/features/diario/components/SketchSvg';
import type { SketchStrokes } from '@/features/diario/components/SketchPad';
import type { DiaryEntry, Photo } from '@/core/types';
import { longDate } from '@/utils/dates';

const MOOD_COLORS = ['#C0504D', '#C67B5C', '#E0A458', '#3E6B60', '#4E8C6A'];

const WEATHER_LABELS: Record<string, string> = {
  '☀️': 'Soleado', '⛅': 'Nublado', '🌧️': 'Lluvioso', '❄️': 'Frío', '🌪️': 'Tormenta', '🌫️': 'Niebla',
};

interface DayData {
  entry: DiaryEntry | null;
  gratitudes: string[];
  photos: Photo[];
  audios: Array<{ id: number; durationS: number | null; filePath: string }>;
  sketches: Array<{ id: number; strokes: SketchStrokes }>;
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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewingSketch, setViewingSketch] = useState<{ id: number; strokes: SketchStrokes } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [word, setWord] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const entry = await diaryRepository.getEntryByDate(date);
      const db = await getDatabase();

      // Etiquetas + palabra del día (consistente con el editor)
      setTags(entry ? await diaryRepository.getTagsOfEntry(entry.id) : []);
      setWord(entry ? await diaryRepository.getWordOfDay(entry.id) : null);

      const gratitudeRows = entry
        ? await db.getAllAsync<{ text: string }>('SELECT text FROM gratitude_items WHERE entry_id = ? ORDER BY created_at', [entry.id])
        : [];

      const photoRows = entry
        ? await db.getAllAsync<{ id: number; file_path: string; thumb_path: string | null }>(
            "SELECT id, file_path, thumb_path FROM photos WHERE owner_type = 'diary' AND owner_id = ?", [entry.id])
        : [];

      const audioRows = entry
        ? await db.getAllAsync<{ id: number; file_path: string; duration_s: number | null }>(
            'SELECT id, file_path, duration_s FROM audio_notes WHERE entry_id = ?', [entry.id])
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
        audios: audioRows.map(r => ({ id: r.id, durationS: r.duration_s, filePath: r.file_path })),
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
        subtitle: 'Mi día en DiarioFit',
        stats: [
          { value: data?.entry?.mood ? `${data.entry.mood}/5` : '—', label: 'Ánimo', color: '#3E6B60' },
          { value: data?.entry?.energy ? `${data.entry.energy}/5` : '—', label: 'Energía', color: '#E0A458' },
          { value: data?.workout ? `${data.workout.exercises.length}` : '—', label: 'Ejercicios', color: '#C67B5C' },
        ],
        footer: '@diariofit',
        dayDate: date!,
      });
      await pdfService.shareSocial(uri);
    } catch { /* error manejado por sistema */ }
    finally { setExporting(null); }
  };

  const playAudio = async (filePath: string) => {
    try {
      await audioService.play(filePath);
      setToast({ message: '▶️ Reproduciendo nota…', status: 'success' });
    } catch {
      setToast({ message: 'No se pudo reproducir el audio', status: 'error' });
    }
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
      {/* Barra de color del ánimo (consistente con el gráfico del Diario) */}
      {entry?.mood != null && (
        <View
          style={{ height: 5, borderRadius: 3, backgroundColor: MOOD_COLORS[entry.mood - 1] ?? theme.border, marginBottom: 14 }}
          accessibilityLabel={`Ánimo ${entry.mood} de 5`}
        />
      )}

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Kicker>DÍA (SOLO LECTURA)</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>{longDate(date!)}</Text>
          {entry?.isClosed && <Badge variant="habit" style={{ marginTop: 6 }}>🔒 Día cerrado</Badge>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="✏️" variant="ghost" onPress={() => router.push(`/entrada/${date}`)} style={{ width: 48, paddingHorizontal: 0 }} />
          <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
        </View>
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
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>{WEATHER_LABELS[entry.weatherIcon] ?? 'Clima'}</Text>
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

      {/* Etiquetas */}
      {tags.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 8 }}>🏷️ ETIQUETAS</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(t => <Badge key={t} variant="tag">{`#${t}`}</Badge>)}
          </View>
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

      {/* Palabra del día */}
      {word && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 6 }}>✨ PALABRA DEL DÍA</Kicker>
          <Text style={[typeScale.h2, { color: theme.primary }]}>{word}</Text>
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
              {photos.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setViewerIndex(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver foto ${i + 1} de ${photos.length} a pantalla completa`}
                >
                  <Image
                    source={{ uri: p.thumbPath ?? p.filePath }}
                    style={{ width: 108, height: 108, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border }}
                  />
                </Pressable>
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
            <Pressable
              key={a.id}
              onPress={() => { void playAudio(a.filePath); }}
              accessibilityRole="button"
              accessibilityLabel={`Reproducir nota de voz de ${a.durationS ?? 0} segundos`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 8 }}
            >
              <Text style={{ fontSize: 16 }}>▶️</Text>
              <Text style={[typeScale.bodySm, { color: theme.text, flex: 1 }]}>{`Nota de voz (${a.durationS ?? 0}s)`}</Text>
              <Badge variant="tag">Reproducir</Badge>
            </Pressable>
          ))}
        </Card>
      )}

      {/* Sketches */}
      {sketches.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <View style={{ marginBottom: 8 }}><Kicker>{`✍️ SKETCHES (${sketches.length})`}</Kicker></View>
          {sketches.map(sk => (
            <Pressable
              key={sk.id}
              onPress={() => setViewingSketch(sk)}
              style={{ marginBottom: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Ver sketch a pantalla completa"
            >
              <SketchSvg
                strokes={sk.strokes}
                style={{ height: 150, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border }}
              />
            </Pressable>
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

      {/* Visor de fotos a pantalla completa */}
      <PhotoViewerModal
        photos={photos}
        visible={viewerIndex !== null}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

      {/* Visor de sketch a pantalla completa */}
      <Modal visible={viewingSketch !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewingSketch(null)}>
        <Pressable onPress={() => setViewingSketch(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '90%', height: 420, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', padding: 16 }}>
            {viewingSketch && <SketchSvg strokes={viewingSketch.strokes} style={{ flex: 1 }} />}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 16 }}>Toca en cualquier lugar para cerrar</Text>
        </Pressable>
      </Modal>

      {/* Feedback */}
      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
