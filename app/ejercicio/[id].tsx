import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, BigData, Button, Card, EmptyState, Kicker } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import type { Exercise } from '@/core/types';

/**
 * Detalle de ejercicio — ARQUITECTURA_INFORMACION §1 · nivel 3
 * Instrucciones + historial completo de PR y últimas marcas (HU-13).
 */

interface BestSet {
  weight: number;
  reps: number;
}

export default function EjercicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [best, setBest] = useState<BestSet | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const all = await workoutRepository.listExercises();
      const ex = all.find((e) => e.id === Number(id)) ?? null;
      setExercise(ex);
      const b = await workoutRepository.getBestSet(Number(id));
      setBest(b);
    } catch { /* estado vacío manejado */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Cargando ejercicio…" message="Un instante." />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState
          icon="⚠️"
          title="Ejercicio no encontrado"
          message="Puede que haya sido archivado."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
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
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Kicker>{exercise.musclePrimary.toUpperCase()}</Kicker>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      <Text style={[typeScale.h1, { color: theme.text, marginBottom: 8 }]}>{exercise.name}</Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {exercise.equipment && <Badge variant="tag">{exercise.equipment}</Badge>}
        {exercise.type && <Badge variant="tag">{exercise.type}</Badge>}
        {exercise.muscleSecondary && <Badge variant="tag">{exercise.muscleSecondary}</Badge>}
      </View>

      {/* PR actual */}
      {best && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker variant="gym" style={{ marginBottom: 6 }}>TU MEJOR MARCA</Kicker>
          <BigData size="xl" color={theme.secondary}>{`${best.weight} KG × ${best.reps}`}</BigData>
        </Card>
      )}

      {/* Instrucciones */}
      {exercise.instructions && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 8 }}>TÉCNICA</Kicker>
          <Text style={[typeScale.bodySm, { color: theme.text }]}>{exercise.instructions}</Text>
        </Card>
      )}
    </ScrollView>
  );
}
