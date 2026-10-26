import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, GymCard, Kicker, Progress, Sheet, Toast } from '@/ui';
import { BodyMap } from '@/ui/BodyMap';
import { SetRow } from '@/features/entrenar/components/SetRow';
import { RestTimer } from '@/features/entrenar/components/RestTimer';
import { LegendAccordion } from '@/features/entrenar/components/LegendAccordion';
import { useLiveSession } from '@/features/entrenar/hooks/useLiveSession';
import { useSessionStore } from '@/state/useSessionStore';
import { hapticService } from '@/services/hapticService';
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
  const [showLegends, setShowLegends] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const [exerciseDetail, setExerciseDetail] = useState<Exercise | null>(null);
  const [lastPerf, setLastPerf] = useState<{ weight: number; reps: number } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');

  const ex = exercises[currentIndex];

  const loadDetail = useCallback(async () => {
    if (!ex) return;
    try {
      const detail = await workoutRepository.getExerciseById(ex.exerciseId);
      setExerciseDetail(detail);
      // Último rendimiento real (para sugerencia de carga progresiva)
      setLastPerf(null);
      const history = await workoutRepository.getSessionHistory(ex.exerciseId, 1);
      if (history.length > 0) {
        const prevSets = await workoutRepository.getSetsOfSessionExercise(history[0]!.id);
        const done = prevSets.filter(s => s.isCompleted && s.weight != null && s.reps != null);
        if (done.length > 0) {
          const top = done.reduce((a, b) => ((b.weight ?? 0) * (b.reps ?? 0) > (a.weight ?? 0) * (a.reps ?? 0) ? b : a));
          setLastPerf({ weight: top.weight ?? 0, reps: top.reps ?? 0 });
        }
      }
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
    if (isPr) {
      hapticService.pr();
      setToast({ message: '🏆 ¡Nuevo PR!', status: 'pr' });
    } else {
      hapticService.success();
    }
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
        <Button label="📖 Leyendas y conceptos" variant="ghost" onPress={() => setShowLegends(true)} style={{ marginBottom: 14, height: 40 }} />

        {/* Barra de progreso global */}
        {(() => {
          const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
          const doneSets = exercises.reduce((a, e) => a + e.sets.filter(s => s.isCompleted).length, 0);
          return (
            <Card style={{ marginBottom: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Kicker>PROGRESO</Kicker>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`${doneSets}/${totalSets} series`}</Text>
              </View>
              <Progress progress={totalSets > 0 ? doneSets / totalSets : 0} />
            </Card>
          );
        })()}

        {/* Detalle del ejercicio */}
        {exerciseDetail && (
          <Card style={{ marginBottom: 14 }}>
            {/* Imagen del ejercicio */}
            {exerciseDetail.imagePath && (
              <Image source={{ uri: exerciseDetail.imagePath }} style={{ width: '100%', height: 160, borderRadius: radius.lg, marginBottom: 12 }} resizeMode="cover" />
            )}

            {/* Zonas musculares */}
            {zones.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {zones.map((z, i) => (
                    <View key={i} style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{ZONE_ICONS[z.toLowerCase()] ?? '✅'} {z}</Text>
                    </View>
                  ))}
                </View>
                {/* Mapa corporal */}
                <BodyMap activeZones={zones} height={160} />
              </>
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
              <Button label="🎬 Ver video demostrativo" variant="ghost" onPress={() => Linking.openURL(exerciseDetail.videoUrl!).catch(() => { setToast({ message: 'No se pudo abrir el vídeo', status: 'error' }); })} style={{ marginTop: 10, height: 40 }} />
            )}
          </Card>
        )}

        {/* Última vez + sugerencia de progresión */}
        {ex.historyLine && (
          <Card style={{ marginBottom: 14, padding: 14 }}>
            <Kicker style={{ marginBottom: 4 }}>ÚLTIMA VEZ</Kicker>
            <BigData size="md" color={theme.secondary}>{ex.historyLine}</BigData>
            {lastPerf && lastPerf.weight > 0 && (() => {
              // Carga progresiva: sugiere subir el peso según la magnitud
              const step = lastPerf.weight >= 100 ? 5 : lastPerf.weight >= 40 ? 2.5 : lastPerf.weight >= 20 ? 1 : 0.5;
              const suggested = Math.round((lastPerf.weight + step) * 2) / 2;
              return (
                <View style={{ marginTop: 10, backgroundColor: `${theme.secondary}14`, borderRadius: 12, padding: 12 }}>
                  <Text style={[typeScale.caption, { color: theme.secondary, fontWeight: '700', marginBottom: 4 }]}>💡 SUGERENCIA DE HOY</Text>
                  <Text style={[typeScale.bodySm, { color: theme.text, lineHeight: 20 }]}>
                    {`Intenta ${suggested} kg × ${lastPerf.reps} (sube ${step} kg). Si terminas con RPE ≤ 8, la próxima semana vuelve a subir.`}
                  </Text>
                </View>
              );
            })()}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Kicker variant="gym">SERIES</Kicker>
            <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`${ex.sets.filter(s => s.isCompleted).length}/${ex.sets.length} completadas`}</Text>
          </View>
          {ex.sets.map(s => (
            <SetRow
              key={s.setNumber}
              set={s}
              onComplete={() => handleComplete(s.setNumber, s.weight, s.reps)}
              onWeight={(w) => useSessionStore.getState().updateSet(currentIndex, s.setNumber, { weight: w })}
              onReps={(r) => useSessionStore.getState().updateSet(currentIndex, s.setNumber, { reps: r })}
              onRpe={(r) => useSessionStore.getState().updateSet(currentIndex, s.setNumber, { rpe: r })}
            />
          ))}
          <Button label="＋ Añadir serie" variant="ghost" onPress={() => { hapticService.light(); useSessionStore.getState().addSet(currentIndex); }} style={{ marginTop: 10 }} />
        </GymCard>

        {/* Navegación */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button label="← Anterior" variant="ghost" disabled={currentIndex === 0} onPress={() => { hapticService.light(); useSessionStore.getState().setCurrentIndex(currentIndex - 1); }} style={{ flex: 1 }} />
          <Button label="Siguiente →" variant="gym" disabled={currentIndex >= exercises.length - 1} onPress={() => { hapticService.light(); useSessionStore.getState().setCurrentIndex(currentIndex + 1); }} style={{ flex: 1 }} />
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

      {/* Sheet de Leyendas */}
      <Sheet visible={showLegends} title="📖 Leyendas y conceptos" onClose={() => setShowLegends(false)}>
        <ScrollView style={{ maxHeight: 480 }}>
          <LegendAccordion title="🏋️ RPE — Esfuerzo Percibido">
            Escala del 1 al 10 que mide qué tan dura se sintió una serie:
            {"\n\n"}• RPE 1-3: Muy fácil, podrías hacer el doble
            {"\n"}• RPE 4-6: Moderado, cómodo pero con esfuerzo
            {"\n"}• RPE 7-8: Difícil, quedaron 2-3 reps "en el tanque"
            {"\n"}• RPE 9: Solo 1 rep más posible
            {"\n"}• RPE 10: Hasta el fallo muscular total
            {"\n\n"}Para qué sirve: Si hoy haces 80kg×5 con RPE 8, la próxima semana sabes que puedes subir a 82.5kg porque aún tenías margen.
          </LegendAccordion>

          <LegendAccordion title="🏆 PR — Personal Record (Récord Personal)">
            Es tu mejor marca histórica en un ejercicio. La app lo detecta automáticamente: cada vez que completas una serie con más peso×reps que antes, aparece el badge 🏆 y una vibración especial.
          </LegendAccordion>

          <LegendAccordion title="📊 KG × Reps — Volumen">
            Peso multiplicado por repeticiones = tu volumen de trabajo. 80kg × 5 reps = 400 de volumen. Sirve para comparar sesiones: si sube tu volumen semanal, estás progresando.
          </LegendAccordion>

          <LegendAccordion title="⏸️ Descanso entre series">
            El tiempo que esperas entre series. Depende de tu objetivo:
            {"\n\n"}• Fuerza (1-5 reps): 3-5 minutos
            {"\n"}• Hipertrofia (6-12 reps): 60-90 segundos
            {"\n"}• Resistencia (15+ reps): 30-60 segundos
            {"\n\n"}El timer de la app se ajusta automáticamente al nivel de esfuerzo del ejercicio.
          </LegendAccordion>

          <LegendAccordion title="📐 Nivel de Habilidad (1-5)">
            Qué tan técnica es la ejecución:
            {"\n\n"}• 1: Cualquiera puede hacerlo (press de pecho en máquina)
            {"\n"}• 2: Técnica básica (curl de bíceps)
            {"\n"}• 3: Coordinación moderada (sentadilla con barra)
            {"\n"}• 4: Técnica avanzada (peso muerto rumano)
            {"\n"}• 5: Experticia necesaria (Olympico, Muscle-up)
          </LegendAccordion>

          <LegendAccordion title="🔥 Nivel de Esfuerzo (1-5)">
            Qué tan exigente es el ejercicio para tu cuerpo:
            {"\n\n"}• 1: Recuperación activa
            {"\n"}• 2-3: Ejercicio suave, calentamiento
            {"\n"}• 4: Esfuerzo moderado-alto
            {"\n"}• 5: Máximo esfuerzo, compuesto pesado
            {"\n\n"}El descanso automático usa este nivel para calcular el tiempo.
          </LegendAccordion>

          <LegendAccordion title="🔄 Sustituciones">
            Cuando no tienes acceso a una máquina o peso, la app te sugiere alternativas del mismo músculo principal con diferente equipo. Por ejemplo: no hay máquina de pecho → prueba flexiones o press con mancuernas.
          </LegendAccordion>

          <LegendAccordion title="🧍 Mapa Corporal">
            Muestra qué zonas trabaja cada ejercicio. Frente: pecho, hombros, brazos, core. Espalda: dorsal, lumbar, trapecio. Pierna: cuádriceps, isquiotibiales, gemelos.
          </LegendAccordion>
        </ScrollView>
      </Sheet>
    </View>
  );
}
