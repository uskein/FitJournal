import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, GymCard, Kicker, Sheet, Toast } from '@/ui';
import { SetRow } from '@/features/entrenar/components/SetRow';
import { RestTimer } from '@/features/entrenar/components/RestTimer';
import { useLiveSession } from '@/features/entrenar/hooks/useLiveSession';
import { useSessionStore } from '@/state/useSessionStore';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { getDatabase } from '@/core/db/database';
import type { Exercise, Photo } from '@/core/types';

const ZONE_ICONS: Record<string, string> = {
  pecho: '🫁', espalda: '🔙', pierna: '🦵', hombro: '💪', brazo: '💪',
  core: '🎯', glúteo: '🍑', cardio: '❤️', full: '🔥',
};

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
  const [exerciseDetail, setExerciseDetail] = useState<Exercise | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  const ex = exercises[currentIndex];

  const loadDetail = useCallback(async () => {
    if (!ex) return;
    try {
      const detail = await workoutRepository.getExerciseById(ex.exerciseId);
      setExerciseDetail(detail);
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ id: number; file_path: string; thumb_path: string | null }>(
        'SELECT id, file_path, thumb_path FROM photos WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC',
        ['session', ex.sessionExerciseId],
      );
      setPhotos(rows.map(r => ({ id: r.id, ownerType: 'session' as const, ownerId: 0, filePath: r.file_path, thumbPath: r.thumb_path, width: null, height: null, createdAt: '' })));
    } catch { /* vacío */ }
  }, [ex?.exerciseId, ex?.sessionExerciseId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const addPhoto = async () => {
    if (!ex) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setToast({ message: 'Permiso de cámara denegado', status: 'error' }); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const stamp = `${Date.now()}.jpg`;
    const dest = new File(dir, stamp);
    new File(result.assets[0].uri).copy(dest);
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO photos (owner_type, owner_id, file_path, thumb_path, created_at) VALUES (?, ?, ?, ?, ?)',
      ['session', ex.sessionExerciseId, dest.uri, dest.uri, new Date().toISOString()],
    );
    setToast({ message: '📷 Foto añadida', status: 'success' });
    loadDetail();
  };

  const handleComplete = async (setNumber: number, weight: number, reps: number) => {
    if (!ex) return;
    const isPr = await completeSet(currentIndex, setNumber, weight, reps, null);
    if (isPr) setToast({ message: '🏆 ¡Nuevo PR!', status: 'pr' });
    setRestKey(k => k + 1);
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
        <EmptyState icon="⚠️" title="No se pudo cargar la sesión" message={`Error (${error.code}).`} actionLabel="Reintentar" onAction={() => router.back()} />
      </View>
    );
  }

  if (!ex) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState icon="📋" title="Esta rutina está vacía" message="Añade ejercicios desde la biblioteca." actionLabel="Ir a biblioteca" onAction={() => router.push('/entrenar')} />
      </View>
    );
  }

  const zones = exerciseDetail?.muscleZones ? exerciseDetail.muscleZones.split(',').map(z => z.trim()) : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Kicker variant="gym">SESIÓN EN CURSO</Kicker>
            <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>{ex.name}</Text>
          </View>
          <Button label="✕" variant="ghost" onPress={() => setShowFinish(true)} style={{ width: 48, paddingHorizontal: 0 }} />
        </View>

        {/* Detalle del ejercicio */}
        {exerciseDetail && (
          <Card style={{ marginBottom: 14 }}>
            {/* Imagen del ejercicio */}
            {exerciseDetail.imagePath && (
              <Image source={{ uri: exerciseDetail.imagePath }} style={{ width: '100%', height: 160, borderRadius: radius.lg, marginBottom: 12 }} resizeMode="cover" />
            )}

            {/* Zonas musculares */}
            {zones.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {zones.map((z, i) => (
                  <View key={i} style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{ZONE_ICONS[z.toLowerCase()] ?? '✅'} {z}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Niveles */}
            {exerciseDetail.skillLevel && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Habilidad:</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(i => <View key={i} style={{ width: 16, height: 6, borderRadius: 3, backgroundColor: i <= exerciseDetail.skillLevel! ? theme.primary : theme.border }} />)}
                </View>
              </View>
            )}
            {exerciseDetail.effortLevel && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Esfuerzo:</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(i => <View key={i} style={{ width: 16, height: 6, borderRadius: 3, backgroundColor: i <= exerciseDetail.effortLevel! ? theme.secondary : theme.border }} />)}
                </View>
              </View>
            )}

            {/* Instrucciones */}
            {exerciseDetail.instructions && (
              <Text style={[typeScale.bodySm, { color: theme.text, marginTop: 8, lineHeight: 20 }]} numberOfLines={3}>
                {exerciseDetail.instructions}
              </Text>
            )}

            {/* Video */}
            {exerciseDetail.videoUrl && (
              <Button label="🎬 Ver video demostrativo" variant="ghost" onPress={() => {}} style={{ marginTop: 10, height: 40 }} />
            )}
          </Card>
        )}

        {/* Última vez */}
        {ex.historyLine && (
          <Card style={{ marginBottom: 14, padding: 14 }}>
            <Kicker style={{ marginBottom: 4 }}>ÚLTIMA VEZ</Kicker>
            <BigData size="md" color={theme.secondary}>{ex.historyLine}</BigData>
          </Card>
        )}

        {/* Fotos de la sesión */}
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {photos.map(p => (
                <Image key={p.id} source={{ uri: p.thumbPath ?? p.filePath }} style={{ width: 80, height: 80, borderRadius: radius.md, ...shadows.clay }} />
              ))}
            </View>
          </ScrollView>
        )}

        {/* Añadir foto */}
        <Button label="📷 Añadir foto de la sesión" variant="ghost" onPress={addPhoto} style={{ marginBottom: 14 }} />

        {/* Descanso */}
        <RestTimer key={restKey} seconds={exerciseDetail?.effortLevel ? 60 + exerciseDetail.effortLevel * 60 : 120} />

        {/* Series */}
        <GymCard style={{ marginBottom: 14 }}>
          <Kicker variant="gym" style={{ marginBottom: 8 }}>SERIES</Kicker>
          {ex.sets.map(s => (
            <SetRow key={s.setNumber} set={s} onComplete={() => handleComplete(s.setNumber, s.weight, s.reps)} onWeight={() => {}} onReps={() => {}} />
          ))}
        </GymCard>

        {/* Navegación */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="← Anterior" variant="ghost" disabled={currentIndex === 0} onPress={() => useSessionStore.getState().setCurrentIndex(currentIndex - 1)} style={{ flex: 1 }} />
          <Button label="Siguiente →" variant="gym" disabled={currentIndex >= exercises.length - 1} onPress={() => useSessionStore.getState().setCurrentIndex(currentIndex + 1)} style={{ flex: 1 }} />
        </View>

        {/* Dots */}
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          {exercises.map((e, i) => (
            <View key={e.sessionExerciseId} style={{ width: i === currentIndex ? 24 : 8, height: 8, borderRadius: 999, backgroundColor: i === currentIndex ? theme.secondary : theme.border }} />
          ))}
        </View>
      </ScrollView>

      <Sheet visible={showFinish} title="¿Finalizar sesión?" onClose={() => setShowFinish(false)}>
        <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 20 }]}>Tu progreso queda guardado.</Text>
        <Button label="🏁 Finalizar y guardar" variant="gym" onPress={handleFinish} style={{ marginBottom: 10 }} />
        <Button label="Seguir entrenando" variant="ghost" onPress={() => setShowFinish(false)} />
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </View>
  );
}
