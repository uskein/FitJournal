import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { substitutionService, type Substitution } from '@/services/substitutionService';
import type { Exercise } from '@/core/types';

const SKILL_LABELS = ['', 'Principiante', 'Intermedio', 'Avanzado', 'Experto', 'Maestría'];
const EFFORT_LABELS = ['', 'Muy suave', 'Suave', 'Moderado', 'Intenso', 'Máximo'];
const ZONE_ICONS: Record<string, string> = {
  pecho: '🫁', espalda: '🔙', pierna: '🦵', hombro: '💪', brazo: '💪',
  core: '🎯', glúteo: '🍑', cardio: '❤️', full: '🔥',
};

function LevelBar({ level, color, label }: { level: number; color: string; label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E6A65', marginBottom: 6, letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: i <= level ? color : '#E8E0D6' }} />
        ))}
      </View>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#2B2B2B', marginTop: 4 }}>{label === 'NIVEL DE HABILIDAD' ? SKILL_LABELS[level] : EFFORT_LABELS[level]}</Text>
    </View>
  );
}

export default function EjercicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [best, setBest] = useState<{ weight: number; reps: number } | null>(null);
  const [alternatives, setAlternatives] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const ex = await workoutRepository.getExerciseById(Number(id));
      setExercise(ex);
      setBest(await workoutRepository.getBestSet(Number(id)));
      setAlternatives(await substitutionService.getAlternatives(Number(id)));
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

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
        <EmptyState icon="⚠️" title="Ejercicio no encontrado" message="Puede que haya sido archivado." actionLabel="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  const zones = exercise.muscleZones ? exercise.muscleZones.split(',').map(z => z.trim()) : [];
  const benefits = exercise.healthBenefits ? exercise.healthBenefits.split('\n').filter(Boolean) : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Kicker>{exercise.musclePrimary.toUpperCase()}</Kicker>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      <Text style={[typeScale.h1, { color: theme.text, marginBottom: 8 }]}>{exercise.name}</Text>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {exercise.equipment && <Badge variant="tag">{`🔧 ${exercise.equipment}`}</Badge>}
        {exercise.type && <Badge variant="tag">{exercise.type}</Badge>}
      </View>

      {/* Imagen */}
      {exercise.imagePath && (
        <Image source={{ uri: exercise.imagePath }} style={{ width: '100%', height: 200, borderRadius: radius.xl, marginBottom: 16, ...shadows.clay }} resizeMode="cover" />
      )}

      {/* PR actual */}
      {best && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker variant="gym" style={{ marginBottom: 6 }}>TU MEJOR MARCA</Kicker>
          <BigData size="xl" color={theme.secondary}>{`${best.weight} KG × ${best.reps}`}</BigData>
        </Card>
      )}

      {/* Niveles */}
      {(exercise.skillLevel || exercise.effortLevel) && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 12 }}>NIVELES</Kicker>
          {exercise.skillLevel && <LevelBar level={exercise.skillLevel} color={theme.primary} label="NIVEL DE HABILIDAD" />}
          {exercise.effortLevel && <LevelBar level={exercise.effortLevel} color={theme.secondary} label="NIVEL DE ESFUERZO" />}
        </Card>
      )}

      {/* Zonas musculares */}
      {zones.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 10 }}>ZONAS TRABAJADAS</Kicker>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {zones.map((z, i) => (
              <View key={i} style={{ backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>{ZONE_ICONS[z.toLowerCase()] ?? '✅'} {z}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Instrucciones */}
      {exercise.instructions && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 8 }}>TÉCNICA</Kicker>
          <Text style={[typeScale.bodySm, { color: theme.text, lineHeight: 22 }]}>{exercise.instructions}</Text>
        </Card>
      )}

      {/* Beneficios de salud */}
      {benefits.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 10 }}>💚 BENEFICIOS PARA LA SALUD</Kicker>
          {benefits.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 14, marginTop: 2 }}>✅</Text>
              <Text style={[typeScale.bodySm, { color: theme.text, flex: 1, lineHeight: 20 }]}>{b}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Video */}
      {exercise.videoUrl && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 10 }}>🎬 VIDEO DEMOSTRATIVO</Kicker>
          <Button label="▶ Ver video" variant="gym" onPress={() => Linking.openURL(exercise.videoUrl!)} />
        </Card>
      )}

      {/* Alternativas / sustituciones */}
      {alternatives.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Kicker style={{ marginBottom: 10 }}>🔄 ALTERNATIVAS</Kicker>
          <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 10 }]}>
            ¿No tienes acceso a este ejercicio? Prueba estas opciones:
          </Text>
          {alternatives.map(alt => (
            <View key={alt.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '600' }]}>{alt.name}</Text>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>{`${alt.musclePrimary} · ${alt.equipment}`}</Text>
              </View>
              <Button label="Ver" variant="ghost" onPress={() => router.push(`/ejercicio/${alt.id}`)} style={{ height: 36 }} />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
