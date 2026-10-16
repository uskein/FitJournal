import React, { useCallback, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Card, Kicker, EmptyState, Button, Badge } from '@/ui';
import { CalendarMonth } from '@/features/diario/components/CalendarMonth';
import { useMonthEntries } from '@/features/diario/hooks/useMonthEntries';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import type { DiaryEntry } from '@/core/types';
import { todayISO, longDate } from '@/utils/dates';

/**
 * Tab Diario — BLUEPRINTS §2 (4 estados)
 * Calendario con mood color + gym · lista de entradas recientes · búsqueda FTS5.
 */

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function DiarioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const { markers, refresh: refreshMarkers } = useMonthEntries(year, month);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const loadRecent = useCallback(async () => {
    const today = todayISO();
    const list = await diaryRepository.listEntriesByRange('2000-01-01', today);
    setEntries(list.slice(0, 30));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecent().catch(() => {});
      refreshMarkers().catch(() => {});
    }, [loadRecent, refreshMarkers]),
  );

  const onSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setSearching(false);
      loadRecent().catch(() => {});
      return;
    }
    setSearching(true);
    try {
      const results = await diaryRepository.searchDiary(q);
      setEntries(results);
    } catch {
      // B1: FTS inválido → mantener lista anterior
    } finally {
      setSearching(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Kicker>DIARIO</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu cuaderno</Text>
      </View>

      {/* Búsqueda FTS */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder="🔍 Buscar en tus notas…"
          placeholderTextColor={theme.textMuted}
          style={{
            backgroundColor: theme.field,
            borderRadius: radius.md,
            paddingHorizontal: 16,
            height: 48,
            fontFamily: 'NunitoSans_400Regular',
            fontSize: 15,
            color: theme.text,
          }}
        />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          searching ? undefined : (
            <>
              {/* Calendario */}
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Button label="←" variant="ghost" onPress={prevMonth} style={{ width: 44, height: 40, paddingHorizontal: 0 }} />
                  <Text style={[typeScale.h3, { color: theme.text }]}>{MESES[month]} {year}</Text>
                  <Button label="→" variant="ghost" onPress={nextMonth} style={{ width: 44, height: 40, paddingHorizontal: 0 }} />
                </View>
                <CalendarMonth
                  year={year}
                  month={month}
                  markers={markers}
                  todayISO={todayISO()}
                  onPressDay={(iso) => router.push(`/entrada/${iso}`)}
                />
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, justifyContent: 'center' }}>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>● ánimo</Text>
                  <Text style={[typeScale.caption, { color: theme.secondary }]}>● gimnasio</Text>
                </View>
              </Card>
              <Kicker style={{ marginBottom: 10 }}>{searching ? 'RESULTADOS' : 'ENTRADAS RECIENTES'}</Kicker>
            </>
          )
        }
        ListEmptyComponent={
          searching ? undefined : (
            <EmptyState
              icon="🌙"
              title="Aún no hay entradas"
              message="Cada gran historia empieza con una palabra. Escribe la primera hoy."
              actionLabel="Escribir hoy"
              onAction={() => router.push(`/entrada/${todayISO()}`)}
            />
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[typeScale.h3, { color: theme.text }]}>
                {longDate(item.entryDate)}
              </Text>
              {item.mood && <Badge variant="habit">{`${item.mood}/5 ánimo`}</Badge>}
            </View>
            {item.notes ? (
              <Text style={[typeScale.bodySm, { color: theme.textMuted }]} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : (
              <Text style={[typeScale.bodySm, { color: theme.textMuted, fontStyle: 'italic' }]}>
                Entrada sin nota
              </Text>
            )}
            <Button
              label="Abrir"
              variant="ghost"
              onPress={() => router.push(`/entrada/${item.entryDate}`)}
              style={{ marginTop: 10, height: 42 }}
            />
          </Card>
        )}
      />
    </View>
  );
}
