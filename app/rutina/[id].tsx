import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, Kicker, Sheet, Toast } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import type { Exercise } from '@/core/types';

/**
 * Rutina [id] — BLUEPRINTS §7 · HU-13
 * Crear/editar rutina: nombre, descripción, ejercicios ordenados.
 * 'nueva' = modo creación; otro id = edición.
 */

export default function RutinaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nueva';
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await workoutRepository.listExercises();
      setAllExercises(all);

      if (!isNew && id) {
        const db = await import('@/core/db/database').then(m => m.getDatabase());
        const routine = await db.getFirstAsync<{ name: string; description: string | null }>(
          'SELECT name, description FROM routines WHERE id = ?', [Number(id)],
        );
        if (routine) {
          setName(routine.name);
          setDescription(routine.description ?? '');
        }
        const routineExercises = await workoutRepository.getRoutineExercises(Number(id));
        const exerciseIds = routineExercises.map(re => re.exerciseId);
        const linked = all.filter(e => exerciseIds.includes(e.id));
        setSelected(linked);
      }
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExercise = (ex: Exercise) => {
    setSelected((prev) =>
      prev.some((e) => e.id === ex.id)
        ? prev.filter((e) => e.id !== ex.id)
        : [...prev, ex],
    );
  };

  const save = async () => {
    if (!name.trim() || selected.length === 0) {
      setToast({ message: 'Nombre y al menos un ejercicio', status: 'error' });
      return;
    }
    try {
      await workoutRepository.createRoutine({
        name: name.trim(),
        description: description.trim() || null,
        exercises: selected.map((e, i) => ({ exerciseId: e.id, orderIndex: i })),
      });
      setToast({ message: '✓ Rutina guardada', status: 'success' });
      setTimeout(() => router.back(), 600);
    } catch {
      setToast({ message: 'No se pudo guardar', status: 'error' });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Cargando…" message="Un instante." />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 40,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Kicker>{isNew ? 'NUEVA RUTINA' : 'EDITAR RUTINA'}</Kicker>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      <Text style={[typeScale.h1, { color: theme.text, marginBottom: 20 }]}>{isNew ? 'Crear rutina' : 'Editar rutina'}</Text>

      {/* Nombre */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>NOMBRE</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Push Pull Legs"
        placeholderTextColor={theme.textMuted}
        style={{
          backgroundColor: theme.field,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          height: 50,
          fontFamily: 'NunitoSans_400Regular',
          fontSize: 16,
          color: theme.text,
          marginBottom: 16,
        }}
      />

      {/* Descripción */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>DESCRIPCIÓN (opcional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="3 veces por semana"
        placeholderTextColor={theme.textMuted}
        style={{
          backgroundColor: theme.field,
          borderRadius: radius.md,
          paddingHorizontal: 16,
          height: 50,
          fontFamily: 'NunitoSans_400Regular',
          fontSize: 15,
          color: theme.text,
          marginBottom: 20,
        }}
      />

      {/* Ejercicios seleccionados */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Kicker>{`EJERCICIOS (${selected.length})`}</Kicker>
        <Button label="＋ Añadir" variant="ghost" onPress={() => setShowPicker(true)} style={{ height: 40 }} />
      </View>

      {selected.length === 0 ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={[typeScale.bodySm, { color: theme.textMuted, textAlign: 'center' }]}>
            Añade ejercicios desde la biblioteca
          </Text>
        </Card>
      ) : (
        selected.map((ex, i) => (
          <Card key={ex.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`${i + 1}. ${ex.musclePrimary}`}</Text>
                <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '600' }]}>{ex.name}</Text>
              </View>
              <Button label="✕" variant="ghost" onPress={() => toggleExercise(ex)} style={{ width: 44, paddingHorizontal: 0 }} />
            </View>
          </Card>
        ))
      )}

      <Button label="💾 Guardar rutina" onPress={save} style={{ marginTop: 12 }} />

      {/* Picker de ejercicios */}
      <Sheet visible={showPicker} title="Elegir ejercicio" onClose={() => setShowPicker(false)}>
        <ScrollView style={{ maxHeight: 400 }}>
          {allExercises.map((ex) => {
            const isSelected = selected.some((s) => s.id === ex.id);
            return (
              <Button
                key={ex.id}
                label={`${isSelected ? '✓ ' : ''}${ex.name}`}
                variant={isSelected ? 'primary' : 'ghost'}
                onPress={() => toggleExercise(ex)}
                style={{ marginBottom: 8, justifyContent: 'flex-start' }}
              />
            );
          })}
        </ScrollView>
        <Button label="Listo" onPress={() => setShowPicker(false)} style={{ marginTop: 10 }} />
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
