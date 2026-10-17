import React, { useCallback, useState } from 'react';
import { FlatList, TextInput, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import type { DiaryEntry } from '@/core/types';
import { todayISO, longDate } from '@/utils/dates';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MOOD_COLORS = ['#C0504D','#C67B5C','#E0A458','#3E6B60','#4E8C6A'];

export default function DiarioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ totalEntries: 0, totalWords: 0, totalGratitude: 0, totalPhotos: 0 });
  const [recentMoods, setRecentMoods] = useState<number[]>([]);

  const load = useCallback(async () => {
    const today = todayISO();
    const list = await diaryRepository.listEntriesByRange('2000-01-01', today);
    setEntries(list.slice(0, 50));
    setStreak(await diaryRepository.getWritingStreak());
    setStats(await diaryRepository.getStats());
    // Mood de los últimos 14 días
    setRecentMoods(list.slice(0, 14).reverse().map(e => e.mood ?? 0));
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => {}); }, [load]));

  const onSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setSearching(false); load(); return; }
    setSearching(true);
    try { setEntries(await diaryRepository.searchDiary(q)); } catch { /* FTS inválido */ }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Kicker>DIARIO</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu cuaderno</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            {/* Racha + estadísticas */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Card style={{ flex: 1, alignItems: 'center', padding: 14 }}>
                <BigData size="lg" color={theme.accent}>{`${streak}🔥`}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>Racha</Text>
              </Card>
              <Card style={{ flex: 1, alignItems: 'center', padding: 14 }}>
                <BigData size="lg" color={theme.primary}>{String(stats.totalEntries)}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>Entradas</Text>
              </Card>
              <Card style={{ flex: 1, alignItems: 'center', padding: 14 }}>
                <BigData size="lg" color={theme.secondary}>{String(stats.totalGratitude)}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>Gratitudes</Text>
              </Card>
            </View>

            {/* Mood chart últimos 14 días */}
            {recentMoods.length > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <Kicker style={{ marginBottom: 10 }}>📊 ÁNIMO RECIENTE</Kicker>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 50 }}>
                  {recentMoods.map((mood, i) => (
                    <View key={i} style={{ flex: 1, height: `${Math.max(20, (mood / 5) * 100)}%`, borderRadius: 6, backgroundColor: mood > 0 ? MOOD_COLORS[mood - 1] : theme.border }} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>hace 14 días</Text>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>hoy</Text>
                </View>
              </Card>
            )}

            {/* Buscador */}
            <TextInput value={query} onChangeText={onSearch} placeholder="🔍 Buscar en tus notas…" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 16, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 14 }} />

            {/* CTA escribir hoy */}
            <Button label="✏️ Escribir hoy" onPress={() => router.push(`/entrada/${todayISO()}`)} style={{ marginBottom: 16 }} />

            <Kicker style={{ marginBottom: 10 }}>ENTRADAS RECIENTES</Kicker>
          </>
        }
        ListEmptyComponent={
          searching ? null : (
            <EmptyState icon="🌙" title="Aún no hay entradas" message="Tu primera entrada puede ser hoy." actionLabel="Escribir hoy" onAction={() => router.push(`/entrada/${todayISO()}`)} />
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[typeScale.h3, { color: theme.text }]}>{longDate(item.entryDate)}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {item.isClosed && <Badge variant="habit">🔒</Badge>}
                {item.mood && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: MOOD_COLORS[item.mood - 1] }} />}
              </View>
            </View>
            {item.notes ? (
              <Text style={[typeScale.bodySm, { color: theme.textMuted }]} numberOfLines={2}>{item.notes}</Text>
            ) : (
              <Text style={[typeScale.bodySm, { color: theme.textMuted, fontStyle: 'italic' }]}>Sin nota</Text>
            )}
            <Button label="Abrir" variant="ghost" onPress={() => router.push(`/entrada/${item.entryDate}`)} style={{ marginTop: 8, height: 38 }} />
          </Card>
        )}
      />
    </View>
  );
}
