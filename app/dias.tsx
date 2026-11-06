import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Toast } from '@/ui';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import type { DiaryEntry } from '@/core/types';
import { todayISO, longDate } from '@/utils/dates';
import { hapticService } from '@/services/hapticService';

const MOOD_COLORS = ['#C0504D', '#C67B5C', '#E0A458', '#3E6B60', '#4E8C6A'];

export default function DiasListScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiaryEntry[] | null>(null);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await diaryRepository.listEntriesByRange('2000-01-01', todayISO());
      setEntries(list);
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const data = searchResults ?? entries;

  // Búsqueda unificada: FTS5 (notas + etiquetas) + fechas en local (BLUEPRINTS §2)
  const onSearch = async (q: string) => {
    setQuery(q);
    const trimmed = q.trim();
    if (trimmed.length < 2) { setSearchResults(null); return; }
    const lower = trimmed.toLowerCase();
    const localMatch = (e: DiaryEntry) =>
      (e.notes ?? '').toLowerCase().includes(lower) ||
      e.entryDate.includes(trimmed) ||
      longDate(e.entryDate).toLowerCase().includes(lower);
    try {
      const fts = await diaryRepository.searchDiary(trimmed);
      const ids = new Set(fts.map((f) => f.id));
      setSearchResults([...fts, ...entries.filter((e) => !ids.has(e.id) && localMatch(e))]);
    } catch {
      // Error FTS5 → fallback local + Toast (blueprint §2)
      setSearchResults(entries.filter(localMatch));
      setToast({ message: 'Error de búsqueda (FTS5)', status: 'error' });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>DÍAS</Kicker>
        {[1, 2, 3, 4, 5].map(i => <View key={i} style={{ height: 70, borderRadius: 16, backgroundColor: theme.field, marginBottom: 10, opacity: 0.6 + i * 0.05 }} />)}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 16 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Kicker>LISTA DE DÍAS</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>{`${data.length} días`}</Text>
        </View>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder="🔍 Buscar por fecha, notas o etiquetas..."
          placeholderTextColor={theme.textMuted}
          style={{ backgroundColor: theme.field, borderRadius: 16, paddingHorizontal: 16, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text }}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <EmptyState icon="🔍" title="Sin resultados" message={`Ningún día coincide con "${query.trim()}".`} />
          ) : (
            <EmptyState icon="🌙" title="Aún no hay días registrados" message="Empieza a escribir en tu diario." actionLabel="Escribir hoy" onAction={() => router.push(`/entrada/${todayISO()}`)} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { hapticService.light(); router.push(`/dia/${item.entryDate}`); }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              marginBottom: 10,
            })}
          >
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={[typeScale.h3, { color: theme.text }]}>{longDate(item.entryDate)}</Text>
                    {item.isClosed && <Text style={{ fontSize: 14 }}>🔒</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                    {item.mood && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MOOD_COLORS[item.mood - 1] }} />
                        <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`Ánimo ${item.mood}/5`}</Text>
                      </View>
                    )}
                    {item.energy && <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`⚡${item.energy}/5`}</Text>}
                    {item.sleepHours != null && <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`😴${item.sleepHours}h`}</Text>}
                    {item.bodyWeight != null && <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`⚖️${item.bodyWeight}kg`}</Text>}
                  </View>
                </View>
                <Text style={{ fontSize: 18, color: theme.primary }}>›</Text>
              </View>
              {item.notes && (
                <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 6 }]} numberOfLines={1}>{item.notes}</Text>
              )}
            </Card>
          </Pressable>
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
