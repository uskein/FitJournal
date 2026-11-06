import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { BigData, Button, Card, Kicker, Toast } from '@/ui';
import { bodyMeasurementService, type BodyMeasurement } from '@/services/bodyMeasurementService';
import { photoService } from '@/services/photoService';
import { PhotoViewerModal } from '@/features/diario/components/PhotoViewerModal';
import { todayISO } from '@/utils/dates';
import type { Photo } from '@/core/types';

const FIELDS = [
  { key: 'weight', label: 'Peso (kg)', icon: '⚖️', unit: 'kg' },
  { key: 'chest', label: 'Pecho (cm)', icon: '🫁', unit: 'cm' },
  { key: 'waist', label: 'Cintura (cm)', icon: '📐', unit: 'cm' },
  { key: 'hips', label: 'Cadera (cm)', icon: '🍑', unit: 'cm' },
  { key: 'armRight', label: 'Brazo derecho (cm)', icon: '💪', unit: 'cm' },
  { key: 'armLeft', label: 'Brazo izquierdo (cm)', icon: '💪', unit: 'cm' },
  { key: 'thighRight', label: 'Muslo derecho (cm)', icon: '🦵', unit: 'cm' },
  { key: 'thighLeft', label: 'Muslo izquierdo (cm)', icon: '🦵', unit: 'cm' },
  { key: 'neck', label: 'Cuello (cm)', icon: '🗣️', unit: 'cm' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

/** Métricas destacadas en la tarjeta de estadísticas */
const STAT_METRICS: Array<{ key: FieldKey; label: string; icon: string; unit: string }> = [
  { key: 'weight', label: 'Peso', icon: '⚖️', unit: 'kg' },
  { key: 'waist', label: 'Cintura', icon: '📐', unit: 'cm' },
  { key: 'chest', label: 'Pecho', icon: '🫁', unit: 'cm' },
  { key: 'hips', label: 'Cadera', icon: '🍑', unit: 'cm' },
];

const MAX_PHOTOS = 4;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Diferencia entre dos valores (redondeada a 0.1) o null si falta alguno */
function deltaOf(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  return Math.round((a - b) * 10) / 10;
}

function deltaText(d: number): string {
  if (d === 0) return '＝ 0';
  return `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d))}`;
}

/** Color del delta: cintura/cadera/cuello mejoran bajando, pecho/brazo/muslo subiendo, peso neutral */
function deltaColor(d: number, key: string, theme: ReturnType<typeof useTheme>): string {
  if (d === 0 || key === 'weight') return theme.textMuted;
  const lowerBetter = key === 'waist' || key === 'hips' || key === 'neck';
  const good = lowerBetter ? d < 0 : d > 0;
  return good ? theme.success : theme.error;
}

export default function MedidasScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<BodyMeasurement[]>([]);
  const [photosBy, setPhotosBy] = useState<Record<number, Photo[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [staged, setStaged] = useState<string[]>([]);
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [chartKey, setChartKey] = useState<'weight' | 'waist'>('weight');
  const [chartW, setChartW] = useState(0);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    // hasta 500 para que "desde el inicio" sea real; se muestran las últimas 20
    const all = await bodyMeasurementService.list(500);
    setHistory(all);
    const map: Record<number, Photo[]> = {};
    await Promise.all(all.slice(0, 20).map(async (m) => {
      map[m.id] = await photoService.listPhotos('body', m.id);
    }));
    setPhotosBy(map);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const latest = history[0] ?? null;
  const prev = history[1] ?? null;
  const first = history[history.length - 1] ?? null;
  const bestWaist = history.reduce<number | null>(
    (acc, m) => (m.waist != null && (acc == null || m.waist < acc) ? m.waist : acc), null);

  const copyLast = () => {
    if (!latest) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = latest[f.key];
      if (v != null) next[f.key] = String(v);
    }
    setValues(next);
    setToast({ message: '↩️ Copiadas las últimas medidas', status: 'success' });
  };

  const pickStaged = async (fromCamera: boolean) => {
    if (staged.length >= MAX_PHOTOS) return;
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setToast({ message: 'Permiso denegado', status: 'error' }); return; }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], quality: 0.7,
            allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - staged.length,
          });
      if (res.canceled) return;
      const uris = (res.assets ?? []).map(a => a.uri);
      setStaged(prevStaged => [...prevStaged, ...uris].slice(0, MAX_PHOTOS));
    } catch {
      setToast({ message: 'No se pudo abrir la cámara/galería', status: 'error' });
    }
  };

  const save = async () => {
    const hasValue = FIELDS.some(f => (values[f.key] ?? '').trim() !== '') || (values.notes ?? '').trim() !== '';
    if (!hasValue && staged.length === 0) {
      setToast({ message: 'Escribe al menos una medida o añade una foto', status: 'error' });
      return;
    }
    try {
      const input: Record<string, number | string | null> = {};
      for (const f of FIELDS) {
        const raw = (values[f.key] ?? '').trim().replace(',', '.');
        const v = parseFloat(raw);
        input[f.key] = raw === '' || isNaN(v) ? null : v;
      }
      const notes = (values.notes ?? '').trim();
      input.notes = notes === '' ? null : notes;

      const id = await bodyMeasurementService.record(todayISO(), input);

      // fotos de progreso (se asocian tras guardar para tener el id)
      for (const uri of staged) {
        await photoService.addFromUri('body', id, uri);
      }
      // techo de 4 fotos por medición (las más viejas se descartan)
      const all = await photoService.listPhotos('body', id);
      if (all.length > MAX_PHOTOS) {
        for (const old of all.slice(MAX_PHOTOS)) await photoService.deletePhoto(old.id);
      }

      const n = staged.length;
      setValues({});
      setStaged([]);
      setToast({
        message: n > 0 ? `✓ Medidas y ${n} foto${n > 1 ? 's' : ''} guardadas` : '✓ Medidas guardadas',
        status: 'success',
      });
      load();
    } catch {
      setToast({ message: 'No se pudieron guardar', status: 'error' });
    }
  };

  const confirmDelete = (m: BodyMeasurement) => {
    const nPhotos = photosBy[m.id]?.length ?? 0;
    Alert.alert(
      '¿Borrar medición?',
      `Se eliminarán los datos${nPhotos > 0 ? ` y ${nPhotos} foto${nPhotos > 1 ? 's' : ''}` : ''} del ${m.date}. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await bodyMeasurementService.remove(m.id);
              setToast({ message: '🗑️ Medición borrada', status: 'success' });
              await load();
            } catch {
              setToast({ message: 'No se pudo borrar', status: 'error' });
            }
          },
        },
      ],
    );
  };

  // serie del gráfico (ascendente, hasta 30 puntos con valor)
  const series = history
    .filter(m => m[chartKey] != null)
    .slice(0, 30)
    .reverse()
    .map(m => ({ date: m.date, value: m[chartKey] as number }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Kicker>MEDIDAS CORPORALES</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu cuerpo</Text>
        </View>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} accessibilityLabel="Volver" />
      </View>

      {/* Tarjeta de estadísticas (valores actuales + deltas) */}
      {latest && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>{`TUS MEDIDAS · ${latest.date}`}</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {STAT_METRICS.map((m) => {
              const cur = latest[m.key];
              if (cur == null) return null;
              const dPrev = prev ? deltaOf(cur, prev[m.key]) : null;
              const dFirst = history.length > 1 && first && first.id !== latest.id ? deltaOf(cur, first[m.key]) : null;
              return (
                <View
                  key={m.key}
                  style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, minWidth: '47%', flexGrow: 1 }}
                >
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`${m.icon} ${m.label}`}</Text>
                  <BigData size="md" color={theme.primary}>{`${fmt(cur)}${m.unit}`}</BigData>
                  {dPrev !== null && (
                    <Text style={[typeScale.caption, { color: deltaColor(dPrev, m.key, theme), fontWeight: '700' }]}>
                      {`${deltaText(dPrev)} vs anterior`}
                    </Text>
                  )}
                  {dFirst !== null && (
                    <Text style={[typeScale.caption, { color: theme.textMuted }]}>
                      {`${deltaText(dFirst)} desde el inicio`}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`🔢 ${history.length} medición${history.length === 1 ? '' : 'es'}`}</Text>
            {bestWaist != null && (
              <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`🏆 Mejor cintura: ${fmt(bestWaist)}cm`}</Text>
            )}
          </View>
        </Card>
      )}

      {/* Gráfico de evolución */}
      {history.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <Kicker style={{ marginBottom: 10 }}>📈 EVOLUCIÓN</Kicker>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <Button
              label="⚖️ Peso"
              variant={chartKey === 'weight' ? 'primary' : 'ghost'}
              onPress={() => setChartKey('weight')}
              style={{ flex: 1, height: 40 }}
            />
            <Button
              label="📐 Cintura"
              variant={chartKey === 'waist' ? 'primary' : 'ghost'}
              onPress={() => setChartKey('waist')}
              style={{ flex: 1, height: 40 }}
            />
          </View>
          <View onLayout={e => setChartW(e.nativeEvent.layout.width)}>
            {chartW > 0 && (
              <EvolutionChart
                points={series}
                width={chartW}
                color={chartKey === 'weight' ? theme.primary : theme.secondary}
                unit={chartKey === 'weight' ? 'kg' : 'cm'}
                mutedColor={theme.textMuted}
                borderColor={theme.border}
              />
            )}
          </View>
        </Card>
      )}

      {/* Formulario */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>NUEVA MEDICIÓN</Kicker>
        <Button
          label="↩️ Rellenar con la última"
          variant="ghost"
          onPress={copyLast}
          disabled={!latest}
          style={{ marginBottom: 12 }}
        />
        {FIELDS.map(f => (
          <View key={f.key} style={{ marginBottom: 10 }}>
            <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>{`${f.icon} ${f.label}`}</Text>
            <TextInput
              value={values[f.key] ?? ''}
              onChangeText={v => setValues(prevValues => ({ ...prevValues, [f.key]: v }))}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={theme.textMuted}
              style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 44, fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: theme.text }}
            />
          </View>
        ))}
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>📝 Notas</Text>
        <TextInput
          value={values.notes ?? ''}
          onChangeText={v => setValues(prevValues => ({ ...prevValues, notes: v }))}
          placeholder="¿Cómo lo notaste hoy?"
          placeholderTextColor={theme.textMuted}
          multiline
          style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, minHeight: 76, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, textAlignVertical: 'top', marginBottom: 12 }}
        />

        {/* Fotos de progreso (se guardan con la medición) */}
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 8 }]}>{`📸 FOTOS DE PROGRESO (opcional · ${staged.length}/${MAX_PHOTOS})`}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          {staged.map((uri, i) => (
            <View key={`${uri}_${i}`}>
              <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border }} />
              <Pressable
                onPress={() => setStaged(prevStaged => prevStaged.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.error, borderRadius: 999, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="Quitar foto"
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
          ))}
          {staged.length < MAX_PHOTOS && (
            <>
              <Pressable
                onPress={() => { void pickStaged(true); }}
                style={{ width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.field }}
                accessibilityLabel="Tomar foto con la cámara"
              >
                <Text style={{ fontSize: 20 }}>📷</Text>
              </Pressable>
              <Pressable
                onPress={() => { void pickStaged(false); }}
                style={{ width: 56, height: 56, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.field }}
                accessibilityLabel="Elegir foto de la galería"
              >
                <Text style={{ fontSize: 20 }}>🖼️</Text>
              </Pressable>
            </>
          )}
        </View>
        <Text style={[typeScale.caption, { color: theme.textMuted }]}>Se guardan junto con la medición de hoy (máx. 4).</Text>

        <Button label="Guardar medidas" onPress={save} style={{ marginTop: 14 }} />
      </Card>

      {/* Historial en tarjetas */}
      {history.length > 0 && (
        <Card>
          <Kicker style={{ marginBottom: 12 }}>HISTORIAL</Kicker>
          {history.slice(0, 20).map((m, i) => {
            const older = history[i + 1] ?? null;
            const photos = photosBy[m.id] ?? [];
            const chips = FIELDS.filter(f => m[f.key] != null).map(f => {
              const val = m[f.key] as number;
              const d = older ? deltaOf(val, older[f.key]) : null;
              return (
                <View key={f.key} style={{ backgroundColor: theme.field, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={[typeScale.caption, { color: theme.text }]}>
                    {`${f.icon} ${fmt(val)}${f.unit} `}
                    {d !== null && (
                      <Text style={{ color: deltaColor(d, f.key, theme), fontWeight: '700' }}>{`(${deltaText(d)})`}</Text>
                    )}
                  </Text>
                </View>
              );
            });
            return (
              <View
                key={m.id}
                style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[typeScale.h3, { color: theme.text }]}>{m.date}</Text>
                  <Pressable
                    onPress={() => confirmDelete(m)}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.field }}
                    accessibilityRole="button"
                    accessibilityLabel={`Borrar medición del ${m.date}`}
                  >
                    <Text style={{ fontSize: 15 }}>🗑️</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: m.notes ? 8 : 0 }}>
                  {chips}
                </View>
                {m.notes ? (
                  <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 8 }]}>{`📝 ${m.notes}`}</Text>
                ) : null}
                {photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {photos.map((p, idx) => (
                        <Pressable
                          key={p.id}
                          onPress={() => setViewer({ photos, index: idx })}
                          accessibilityRole="button"
                          accessibilityLabel={`Ver foto ${idx + 1} de ${photos.length} a pantalla completa`}
                        >
                          <Image
                            source={{ uri: p.thumbPath ?? p.filePath }}
                            style={{ width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {/* Visor de fotos de progreso */}
      <PhotoViewerModal
        photos={viewer?.photos ?? []}
        visible={viewer !== null}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}

/** Gráfico de evolución en SVG (línea + puntos, sin librerías externas) */
function EvolutionChart({
  points, width, color, unit, mutedColor, borderColor,
}: {
  points: Array<{ date: string; value: number }>;
  width: number;
  color: string;
  unit: string;
  mutedColor: string;
  borderColor: string;
}) {
  if (points.length < 2) {
    return (
      <Text style={[typeScale.bodySm, { color: mutedColor }]}>
        Necesitas al menos 2 mediciones con valor para ver la evolución.
      </Text>
    );
  }

  const H = 150;
  const padX = 14;
  const padTop = 16;
  const padBottom = 24;
  const vals = points.map(p => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (points.length - 1)) * (width - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / span) * (H - padTop - padBottom);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const firstP = points[0]!;
  const lastP = points[points.length - 1]!;

  return (
    <View>
      <Svg width={width} height={H}>
        <Path
          d={`M ${padX} ${H - padBottom} L ${width - padX} ${H - padBottom}`}
          stroke={borderColor}
          strokeWidth={1}
          fill="none"
        />
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === points.length - 1 ? 5 : 3}
            fill={color}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={[typeScale.caption, { color: mutedColor }]}>{`${firstP.date} → ${lastP.date}`}</Text>
        <Text style={[typeScale.caption, { color, fontWeight: '700' }]}>{`${fmt(lastP.value)}${unit}`}</Text>
      </View>
      <Text style={[typeScale.caption, { color: mutedColor, marginTop: 2 }]}>
        {`Mín ${fmt(min)}${unit} · Máx ${fmt(max)}${unit}`}
      </Text>
    </View>
  );
}
