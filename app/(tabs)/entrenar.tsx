import React, { useCallback, useState } from 'react';
import { FlatList, TextInput, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, GymCard, Kicker } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import type { Exercise, Routine, WorkoutSession } from '@/core/types';
import { todayISO } from '@/utils/dates';

export default function EntrenarScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e, s] = await Promise.all([
        workoutRepository.listRoutines(),
        workoutRepository.listExercises(),
        workoutRepository.getActiveSession(todayISO()),
      ]);
      setRoutines(r);
      setExercises(e);
      setActiveSession(s);
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { load(); return; }
    try { setExercises(await workoutRepository.searchExercises(q)); } catch { /* FTS inválido */ }
  };

  const startSession = async (routineId: number) => {
    try {
      const session = await workoutRepository.startSession(routineId, todayISO());
      router.push(`/sesion/${session.id}`);
    } catch {
      if (activeSession) router.push(`/sesion/${activeSession.id}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>ENTRENAR</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Gimnasio</Text>
        {[1, 2, 3].map(i => <View key={i} style={{ height: 100, borderRadius: 24, backgroundColor: theme.field, marginBottom: 12, opacity: 0.6 + i * 0.1 }} />)}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Kicker>ENTRENAR</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Gimnasio</Text>
      </View>

      <FlatList
        data={routines}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <>
            {activeSession && (
              <GymCard style={{ marginBottom: 16 }}>
                <Kicker variant="gym" style={{ marginBottom: 6 }}>SESIÓN EN CURSO</Kicker>
                <Text style={[typeScale.h3, { color: theme.text, marginBottom: 12 }]}>Continúa donde lo dejaste</Text>
                <Button label="▶ Continuar sesión" variant="gym" onPress={() => router.push(`/sesion/${activeSession.id}`)} />
              </GymCard>
            )}
            <Kicker style={{ marginBottom: 10 }}>MIS RUTINAS</Kicker>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="🏋️" title="Diseña tu primera rutina" message="Elige ejercicios de la biblioteca." actionLabel="➕ Crear rutina" onAction={() => router.push('/rutina/nueva')} />
        }
        ListFooterComponent={
          <>
            <Button label="➕ Nueva rutina" variant="ghost" onPress={() => router.push('/rutina/nueva')} style={{ marginVertical: 16 }} />
            <Kicker style={{ marginBottom: 10 }}>BIBLIOTECA</Kicker>
            <TextInput value={query} onChangeText={onSearch} placeholder="🔍 Buscar ejercicio…" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 16, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 12 }} />
            {exercises.map(ex => (
              <Card key={ex.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '600' }]}>{ex.name}</Text>
                    <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>{ex.musclePrimary}{ex.equipment ? ` · ${ex.equipment}` : ''}</Text>
                  </View>
                  <Button label="Ver" variant="ghost" onPress={() => router.push(`/ejercicio/${ex.id}`)} style={{ height: 40 }} />
                </View>
              </Card>
            ))}
          </>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <Text style={[typeScale.h3, { color: theme.text, marginBottom: 4 }]}>{item.name}</Text>
            {item.description && <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 10 }]}>{item.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="▶ Empezar" variant="gym" onPress={() => startSession(item.id)} style={{ flex: 1, height: 46 }} />
              <Button label="Editar" variant="ghost" onPress={() => router.push(`/rutina/${item.id}`)} style={{ height: 46 }} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
