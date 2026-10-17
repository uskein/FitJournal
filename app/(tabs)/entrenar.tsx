import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, GymCard, Kicker, Sheet, Toast } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { hapticService } from '@/services/hapticService';
import type { Exercise, Routine, WorkoutSession } from '@/core/types';
import { todayISO } from '@/utils/dates';

const ZONE_FILTERS = ['Todos', 'pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'glúteo', 'cardio'];

export default function EntrenarScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  // Biblioteca modal
  const [showLibrary, setShowLibrary] = useState(false);
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('Todos');
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, e, s] = await Promise.all([
        workoutRepository.listRoutines(),
        workoutRepository.listExercises(),
        workoutRepository.getActiveSession(todayISO()),
      ]);
      setRoutines(r);
      setAllExercises(e);
      setFilteredExercises(e);
      setActiveSession(s);
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const applyFilter = useCallback((exercises: Exercise[], q: string, zone: string) => {
    let result = exercises;
    if (q.trim().length >= 2) {
      const lower = q.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(lower) || e.musclePrimary.toLowerCase().includes(lower));
    }
    if (zone !== 'Todos') {
      result = result.filter(e => e.musclePrimary.toLowerCase() === zone.toLowerCase() || (e.muscleZones ?? '').toLowerCase().includes(zone.toLowerCase()));
    }
    setFilteredExercises(result);
  }, []);

  const onSearch = (q: string) => {
    setQuery(q);
    applyFilter(allExercises, q, zoneFilter);
  };

  const onZoneFilter = (zone: string) => {
    setZoneFilter(zone);
    applyFilter(allExercises, query, zone);
  };

  const deleteRoutine = (routine: Routine) => {
    Alert.alert(
      '¿Borrar rutina?',
      `Se eliminará "${routine.name}" y sus ejercicios. No se borran las sesiones anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            const { getDatabase } = await import('@/core/db/database');
            const db = await getDatabase();
            await db.runAsync('UPDATE workout_sessions SET routine_id = NULL WHERE routine_id = ?', [routine.id]);
            await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [routine.id]);
            await db.runAsync('DELETE FROM routines WHERE id = ?', [routine.id]);
            hapticService.medium();
            setToast({ message: '🗑️ Rutina borrada', status: 'success' });
            load();
          },
        },
      ],
    );
  };

  const startSession = async (routineId: number) => {
    try {
      const session = await workoutRepository.startSession(routineId, todayISO());
      router.push(`/sesion/${session.id}`);
    } catch {
      if (activeSession) router.push(`/sesion/${activeSession.id}`);
      else setToast({ message: 'No se pudo iniciar la sesión', status: 'error' });
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
      <View style={{ paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Kicker>ENTRENAR</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Gimnasio</Text>
        </View>
        <Button label="📚 Ejercicios" onPress={() => setShowLibrary(true)} style={{ height: 42 }} />
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
          <Button label="➕ Nueva rutina" variant="ghost" onPress={() => router.push('/rutina/nueva')} style={{ marginTop: 16 }} />
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <Text style={[typeScale.h3, { color: theme.text, marginBottom: 4 }]}>{item.name}</Text>
            {item.description && <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 10 }]}>{item.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="▶ Empezar" variant="gym" onPress={() => startSession(item.id)} style={{ flex: 1, height: 44 }} />
              <Button label="✏️" onPress={() => router.push(`/rutina/${item.id}`)} style={{ width: 44, height: 44, paddingHorizontal: 0 }} accessibilityLabel="Editar rutina" />
              <Button label="🗑️" onPress={() => deleteRoutine(item)} style={{ width: 44, height: 44, paddingHorizontal: 0 }} accessibilityLabel="Borrar rutina" />
            </View>
          </Card>
        )}
      />

      {/* Modal Biblioteca de ejercicios */}
      <Sheet visible={showLibrary} onClose={() => setShowLibrary(false)} title="📚 Biblioteca de ejercicios">
        {/* Buscador */}
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder="🔍 Buscar por nombre..."
          placeholderTextColor={theme.textMuted}
          style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 16, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 12 }}
        />

        {/* Filtro por zona */}
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>FILTRAR POR ZONA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {ZONE_FILTERS.map(zone => (
              <Pressable
                key={zone}
                onPress={() => { hapticService.light(); onZoneFilter(zone); }}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: zoneFilter === zone ? theme.primary : 'transparent',
                  borderWidth: 1.5, borderColor: zoneFilter === zone ? theme.primary : theme.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: zoneFilter === zone ? '#fff' : theme.textMuted }}>
                  {zone === 'Todos' ? '🏋️ Todos' : zone}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Contador */}
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 10 }]}>
          {`${filteredExercises.length} ejercicio${filteredExercises.length !== 1 ? 's' : ''}`}
        </Text>

        {/* Lista de ejercicios */}
        <ScrollView style={{ maxHeight: 400 }}>
          {filteredExercises.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
              <Text style={[typeScale.bodySm, { color: theme.textMuted, textAlign: 'center' }]}>No se encontraron ejercicios</Text>
            </View>
          ) : (
            filteredExercises.map(ex => (
              <Pressable
                key={ex.id}
                onPress={() => { setShowLibrary(false); router.push(`/ejercicio/${ex.id}`); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '700' }]}>{ex.name}</Text>
                  <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>
                    {ex.musclePrimary}{ex.equipment ? ` · ${ex.equipment}` : ''}{ex.skillLevel ? ` · Nivel ${ex.skillLevel}` : ''}
                  </Text>
                </View>
                {ex.effortLevel && <Badge variant="pr" style={{ marginRight: 8 }}>{`Esfuerzo ${ex.effortLevel}`}</Badge>}
                <Text style={{ fontSize: 16, color: theme.primary }}>›</Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        {/* Botón crear ejercicio */}
        <Button
          label="➕ Crear ejercicio propio"
          onPress={() => { setShowLibrary(false); router.push('/ejercicio/nuevo'); }}
          style={{ marginTop: 12 }}
        />
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </View>
  );
}
