import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, Button, EmptyState, Kicker, Toast } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import type { DiaryEntry } from '@/core/types';
import { todayISO, longDate, isoDayOffset } from '@/utils/dates';
import { hapticService } from '@/services/hapticService';
import { CalendarMonth } from '@/features/diario/components/CalendarMonth';
import { useMonthEntries } from '@/features/diario/hooks/useMonthEntries';

const MOOD_CONFIG: Record<number, { color: string; emoji: string; label: string }> = {
  1: { color: '#C0504D', emoji: '😞', label: 'Muy mal' },
  2: { color: '#C67B5C', emoji: '😐', label: 'Bajo' },
  3: { color: '#E0A458', emoji: '🙂', label: 'Bien' },
  4: { color: '#3E6B60', emoji: '😄', label: 'Muy bien' },
  5: { color: '#4E8C6A', emoji: '🤩', label: 'Genial' },
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function AnimatedEntryCard({
  item,
  index,
  tags,
  onPress,
}: {
  item: DiaryEntry;
  index: number;
  tags?: string[];
  onPress: () => void;
}) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [anim, index]);

  const mood = item.mood ? MOOD_CONFIG[item.mood] : null;

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{
        translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
      }],
      marginBottom: 14,
    }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
        {/* Card principal */}
        <View style={{
          backgroundColor: theme.elevated,
          borderRadius: radius.xl,
          ...shadows.clay,
          overflow: 'hidden',
        }}>
          {/* Barra de color del mood */}
          <View style={{ height: 5, backgroundColor: mood?.color ?? theme.border }} />

          <View style={{ padding: 18 }}>
            {/* Fila superior: fecha + badges */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.h3, { color: theme.text, marginBottom: 2 }]}>
                  {longDate(item.entryDate)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {item.isClosed && (
                    <View style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }}>🔒 CERRADO</Text>
                    </View>
                  )}
                  {item.weatherIcon && (
                    <Text style={{ fontSize: 14 }}>{item.weatherIcon}</Text>
                  )}
                </View>
              </View>

              {/* Mood emoji grande */}
              {mood && (
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: `${mood.color}22`,
                  borderWidth: 2.5,
                  borderColor: mood.color,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 26 }}>{mood.emoji}</Text>
                </View>
              )}
            </View>

            {/* Métricas visuales */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              {item.mood && MOOD_CONFIG[item.mood] && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${MOOD_CONFIG[item.mood]!.color}15`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MOOD_CONFIG[item.mood]!.color }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: MOOD_CONFIG[item.mood]!.color }}>
                    {MOOD_CONFIG[item.mood]!.label}
                  </Text>
                </View>
              )}
              {item.energy && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12 }}>⚡</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#8A5B14' }}>{`${item.energy}/5`}</Text>
                </View>
              )}
              {item.sleepHours != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E4E9F5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12 }}>😴</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#4A5899' }}>{`${item.sleepHours}h`}</Text>
                </View>
              )}
              {item.bodyWeight != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.field, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12 }}>⚖️</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textMuted }}>{`${item.bodyWeight}kg`}</Text>
                </View>
              )}
            </View>

            {/* Preview de nota */}
            {item.notes ? (
              <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 12 }}>
                <Text style={[typeScale.bodySm, { color: theme.text, lineHeight: 20 }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 12, alignItems: 'center' }}>
                <Text style={[typeScale.bodySm, { color: theme.textMuted, fontStyle: 'italic' }]}>Sin nota escrita</Text>
              </View>
            )}

            {/* Etiquetas (#tags) */}
            {tags && tags.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {tags.slice(0, 4).map((t) => (
                  <Badge key={t} variant="tag">{`#${t}`}</Badge>
                ))}
                {tags.length > 4 && <Badge variant="tag">{`+${tags.length - 4}`}</Badge>}
              </View>
            )}

            {/* Footer con flecha */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {item.sleepQuality && <Badge variant="tag">{`🌙 ${item.sleepQuality}/5`}</Badge>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[typeScale.caption, { color: theme.primary, fontWeight: '700' }]}>Ver día</Text>
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: theme.primarySoft,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>→</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DiarioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ totalEntries: 0, totalWords: 0, totalGratitude: 0, totalPhotos: 0 });
  const [moodDays, setMoodDays] = useState<Array<{ date: string; mood: number }>>([]);
  const [tagsMap, setTagsMap] = useState<Record<number, string[]>>({});
  const [tags, setTags] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Calendario mensual con mood color (HU-06)
  const { markers, loading: markersLoading, error: markersError, refresh: refreshMarkers } =
    useMonthEntries(view.year, view.month);

  const load = useCallback(async () => {
    const today = todayISO();
    const list = await diaryRepository.listEntriesByRange('2000-01-01', today);
    const recent = list.slice(0, 50);
    setEntries(recent);
    setStreak(await diaryRepository.getWritingStreak());
    setStats(await diaryRepository.getStats());

    // Gráfico: últimos 14 DÍAS calendario (no las últimas 14 entradas)
    const byDate = new Map(recent.map((e) => [e.entryDate, e.mood ?? 0]));
    const days: Array<{ date: string; mood: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = isoDayOffset(-i);
      days.push({ date: d, mood: byDate.get(d) ?? 0 });
    }
    setMoodDays(days);

    // Etiquetas: chips en tarjetas + filtro
    setTagsMap(await diaryRepository.getTagsForEntries(recent.map((e) => e.id)));
    setTags(await diaryRepository.listTagsWithCounts());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } catch { /* vacío */ }
    finally { setRefreshing(false); }
  }, [load]);

  useFocusEffect(useCallback(() => {
    load().catch(() => {});
    refreshMarkers().catch(() => {});
  }, [load, refreshMarkers]));

  const shiftMonth = (delta: number) => {
    hapticService.light();
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const onSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setSearching(false); load().catch(() => {}); return; }
    setSearching(true);
    try {
      const res = await diaryRepository.searchDiary(q);
      setEntries(res);
      setTagsMap(await diaryRepository.getTagsForEntries(res.map((e) => e.id)));
    } catch {
      setToast({ message: 'Error de búsqueda (FTS5)', status: 'error' });
    }
  };

  const visibleEntries = useMemo(() => {
    if (!selectedTag) return entries;
    return entries.filter((e) => (tagsMap[e.id] ?? []).includes(selectedTag));
  }, [entries, selectedTag, tagsMap]);

  const monthHasEntries = Object.values(markers).some((m) => m.hasEntry);

  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: active ? theme.primary : theme.field,
    borderWidth: 1,
    borderColor: active ? theme.primary : theme.border,
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20 }}>
      <FlatList
        data={visibleEntries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Kicker>DIARIO</Kicker>
              <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu cuaderno</Text>
            </View>

            {/* Stats rápidas */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: theme.elevated, borderRadius: radius.xl, padding: 14, alignItems: 'center', ...shadows.clay }}>
                <Text style={{ fontSize: 24, marginBottom: 2 }}>{streak > 0 ? '🔥' : '📝'}</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 22, color: theme.accent }}>{streak}</Text>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Racha</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.elevated, borderRadius: radius.xl, padding: 14, alignItems: 'center', ...shadows.clay }}>
                <Text style={{ fontSize: 24, marginBottom: 2 }}>📓</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 22, color: theme.primary }}>{stats.totalEntries}</Text>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Entradas</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.elevated, borderRadius: radius.xl, padding: 14, alignItems: 'center', ...shadows.clay }}>
                <Text style={{ fontSize: 24, marginBottom: 2 }}>🙏</Text>
                <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 22, color: theme.secondary }}>{stats.totalGratitude}</Text>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Gratitud</Text>
              </View>
            </View>

            {/* Calendario mensual con mood color (HU-06 · BLUEPRINTS §2) */}
            <View style={{ backgroundColor: theme.elevated, borderRadius: radius.xl, padding: 18, marginBottom: 16, ...shadows.clay }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior"
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.primary }}>‹</Text>
                </Pressable>
                <Text style={[typeScale.h3, { color: theme.text }]}>{`${MESES[view.month]} ${view.year}`}</Text>
                <Pressable
                  onPress={() => shiftMonth(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Mes siguiente"
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.field, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.primary }}>›</Text>
                </Pressable>
              </View>

              {/* Error → calendario en modo solo lectura (opacidad) */}
              <View style={{ opacity: markersError ? 0.4 : 1 }}>
                <CalendarMonth
                  year={view.year}
                  month={view.month}
                  markers={markers}
                  todayISO={todayISO()}
                  onPressDay={(iso) => { hapticService.light(); router.push(`/entrada/${iso}`); }}
                />
              </View>

              {/* Leyenda */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3E6B60' }} />
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Ánimo</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.secondary }} />
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Gimnasio</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: theme.primary }} />
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Hoy</Text>
                </View>
              </View>

              {/* Mes en blanco (blueprint empty) */}
              {!markersLoading && !markersError && !monthHasEntries && (
                <View style={{ marginTop: 12, backgroundColor: theme.field, borderRadius: radius.md, padding: 12, alignItems: 'center' }}>
                  <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 8 }]}>{`${MESES[view.month]} en blanco`}</Text>
                  <Button label="✏️ Escribir" variant="ghost" onPress={() => router.push(`/entrada/${todayISO()}`)} style={{ height: 38 }} />
                </View>
              )}
            </View>

            {/* Mood chart: 14 días calendario, toque abre el día */}
            {moodDays.length > 0 && (
              <View style={{ backgroundColor: theme.elevated, borderRadius: radius.xl, padding: 18, marginBottom: 16, ...shadows.clay }}>
                <Kicker style={{ marginBottom: 10 }}>📊 ÁNIMO · ÚLTIMOS 14 DÍAS</Kicker>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 56 }}>
                  {moodDays.map((d) => (
                    <Pressable
                      key={d.date}
                      onPress={() => { hapticService.light(); router.push(`/entrada/${d.date}`); }}
                      style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}
                      accessibilityRole="button"
                      accessibilityLabel={`${longDate(d.date)}: ${d.mood > 0 ? (MOOD_CONFIG[d.mood]?.label ?? '') : 'sin entrada'}`}
                    >
                      <View
                        style={{
                          height: `${Math.max(15, (d.mood / 5) * 100)}%`,
                          borderRadius: 8,
                          backgroundColor: d.mood > 0 && MOOD_CONFIG[d.mood] ? MOOD_CONFIG[d.mood]!.color : theme.border,
                          opacity: 0.85,
                        }}
                      />
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>hace 2 sem</Text>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>hoy</Text>
                </View>
              </View>
            )}

            {/* Buscador */}
            <View style={{ marginBottom: 14 }}>
              <TextInput
                value={query}
                onChangeText={onSearch}
                placeholder="🔍 Buscar en tus notas, etiquetas..."
                placeholderTextColor={theme.textMuted}
                style={{
                  backgroundColor: theme.field, borderRadius: radius.md,
                  paddingHorizontal: 16, height: 48,
                  fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text,
                }}
              />
            </View>

            {/* Filtro por etiquetas */}
            {tags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 14 }}
                contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}
              >
                <Pressable
                  onPress={() => setSelectedTag(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Mostrar todas las entradas"
                  style={chipStyle(selectedTag === null)}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: selectedTag === null ? '#fff' : theme.textMuted }}>Todos</Text>
                </Pressable>
                {tags.map((t) => {
                  const active = selectedTag === t.name;
                  return (
                    <Pressable
                      key={t.name}
                      onPress={() => { hapticService.light(); setSelectedTag(active ? null : t.name); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrar por etiqueta ${t.name}`}
                      style={chipStyle(active)}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#fff' : theme.textMuted }}>{`#${t.name} ${t.count}`}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* CTAs */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <Button label="✏️ Escribir hoy" onPress={() => { hapticService.light(); router.push(`/entrada/${todayISO()}`); }} style={{ flex: 1.2 }} />
              <Button label="📋 Ver días" variant="ghost" onPress={() => router.push('/dias')} style={{ flex: 0.8 }} />
            </View>

            {/* Título sección */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Kicker>
                {searching ? 'RESULTADOS' : selectedTag ? `#${selectedTag}` : 'ENTRADAS RECIENTES'}
              </Kicker>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            </View>
          </>
        }
        ListEmptyComponent={
          searching ? (
            <EmptyState
              icon="🔍"
              title="Sin resultados"
              message={`No encontramos nada para «${query}» en tus notas o etiquetas.`}
            />
          ) : selectedTag ? (
            <EmptyState
              icon="🏷️"
              title={`Sin entradas con #${selectedTag}`}
              message="Prueba con otra etiqueta o quita el filtro."
              actionLabel="Ver todas"
              onAction={() => setSelectedTag(null)}
            />
          ) : (
            <EmptyState icon="🌙" title="Aún no hay entradas" message="Tu primera entrada puede ser hoy." actionLabel="✏️ Escribir hoy" onAction={() => router.push(`/entrada/${todayISO()}`)} />
          )
        }
        renderItem={({ item, index }) => (
          <AnimatedEntryCard
            item={item}
            index={index}
            tags={tagsMap[item.id]}
            onPress={() => router.push(`/entrada/${item.entryDate}`)}
          />
        )}
      />
      <Toast
        message={toast?.message ?? ''}
        status={toast?.status ?? 'success'}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}
