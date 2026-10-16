import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, BigData, Button, Card, EmptyState, GymCard, Kicker, Sheet, Toast } from '@/ui';
import { SetRow } from '@/features/entrenar/components/SetRow';
import { RestTimer } from '@/features/entrenar/components/RestTimer';
import { useLiveSession } from '@/features/entrenar/hooks/useLiveSession';
import { useSessionStore } from '@/state/useSessionStore';

/**
 * Sesión en vivo — BLUEPRINTS §4 · 4 estados · persistencia incremental (regla 2).
 * HU-02 (series 1-toque) · HU-03 (historial inline) · HU-04 (PRs).
 */

export default function SesionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ready, error, completeSet, finish } = useLiveSession(id ? Number(id) : undefined);
  const { exercises, currentIndex } = useSessionStore();
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' | 'pr' } | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [restKey, setRestKey] = useState(0);

  const ex = exercises[currentIndex];

  const handleComplete = async (setNumber: number, weight: number, reps: number) => {
    if (!ex) return;
    const isPr = await completeSet(currentIndex, setNumber, weight, reps, null);
    if (isPr) setToast({ message: '🏆 ¡Nuevo PR!', status: 'pr' });
    setRestKey((k) => k + 1); // activa descanso
  };

  const handleFinish = async () => {
    await finish();
    setShowFinish(false);
    router.back();
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="⏳" title="Preparando tu sesión…" message="Un instante mientras montamos tus ejercicios." />
      </View>
    );
  }

  if (error && exercises.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState
          icon="⚠️"
          title="No se pudo cargar la sesión"
          message={`Error (${error.code}).`}
          actionLabel="Reintentar"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  if (!ex) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState
          icon="📋"
          title="Esta rutina está vacía"
          message="Añade ejercicios desde la biblioteca para poder entrenar."
          actionLabel="Ir a biblioteca"
          onAction={() => router.push('/entrenar')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View>
            <Kicker variant="gym">SESIÓN EN CURSO</Kicker>
            <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>{ex.name}</Text>
          </View>
          <Button label="✕" variant="ghost" onPress={() => setShowFinish(true)} style={{ width: 48, paddingHorizontal: 0 }} />
        </View>

        {/* Historial "última vez" — HU-03 */}
        {ex.historyLine && (
          <Card style={{ marginBottom: 14, padding: 14 }}>
            <Kicker style={{ marginBottom: 4 }}>ÚLTIMA VEZ</Kicker>
            <BigData size="md" color={theme.secondary}>{ex.historyLine}</BigData>
          </Card>
        )}

        {/* Descanso */}
        <RestTimer key={restKey} seconds={ex.restSeconds ?? 120} />

        {/* Series */}
        <GymCard style={{ marginBottom: 14 }}>
          <Kicker variant="gym" style={{ marginBottom: 8 }}>SERIES</Kicker>
          {ex.sets.map((s) => (
            <SetRow
              key={s.setNumber}
              set={s}
              onComplete={() => handleComplete(s.setNumber, s.weight, s.reps)}
              onWeight={() => {}}
              onReps={() => {}}
            />
          ))}
        </GymCard>

        {/* Navegación entre ejercicios */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label="← Anterior"
            variant="ghost"
            disabled={currentIndex === 0}
            onPress={() => useSessionStore.getState().setCurrentIndex(currentIndex - 1)}
            style={{ flex: 1 }}
          />
          <Button
            label="Siguiente →"
            variant="gym"
            disabled={currentIndex >= exercises.length - 1}
            onPress={() => useSessionStore.getState().setCurrentIndex(currentIndex + 1)}
            style={{ flex: 1 }}
          />
        </View>

        {/* Indicador de ejercicios */}
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          {exercises.map((e, i) => (
            <View
              key={e.sessionExerciseId}
              style={{
                width: i === currentIndex ? 24 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: i === currentIndex ? theme.secondary : theme.border,
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Sheet de finalizar */}
      <Sheet visible={showFinish} title="¿Finalizar sesión?" onClose={() => setShowFinish(false)}>
        <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 20 }]}>
          Tu progreso queda guardado. Podrás ver el resumen en Progreso.
        </Text>
        <Button label="🏁 Finalizar y guardar" variant="gym" onPress={handleFinish} style={{ marginBottom: 10 }} />
        <Button label="Seguir entrenando" variant="ghost" onPress={() => setShowFinish(false)} />
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </View>
  );
}
