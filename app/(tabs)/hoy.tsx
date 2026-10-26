import React, { useEffect, useState } from 'react';
import { Animated, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Card, EmptyState, Kicker, MoodCard, GymCard, Button, Badge, ScaleSelector, Toast, Sheet } from '@/ui';
import { moodColors, palette } from '@/theme/tokens';
import { useToday } from '@/features/hoy/hooks/useToday';
import { HabitsRow } from '@/features/hoy/components/HabitsRow';
import { Skeleton } from '@/features/hoy/components/Skeleton';
import { habitRepository } from '@/core/repositories/habitRepository';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { hapticService } from '@/services/hapticService';
import { todayISO, longDate, kickerDate, moodToColorIndex } from '@/utils/dates';

/**
 * Tab Hoy — BLUEPRINTS_DE_PANTALLAS.md §1 · 4 estados implementados:
 * Loading (Skeletons) · Empty (EmptyState blob) · Success (composición) · Error (retry).
 * Fuentes: useToday (hook), componentes Skill 1 (ui/), entidades Skill 2 (core).
 */

const MOOD_EMOJIS = ['😞', '😐', '🙂', '😄', '🤩'] as const;

/** Hero de racha: número grande + fuego con pulso suave (refuerzo de hábito) */
function StreakHero({ streak }: { streak: number }) {
  const theme = useTheme();
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Card style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Animated.View style={{ transform: [{ scale: streak > 0 ? scale : 1 }] }}>
        <Text style={{ fontSize: 38 }}>{streak > 0 ? '🔥' : '🌱'}</Text>
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 30, color: theme.accent, lineHeight: 34 }}>
          {streak}
          <Text style={{ fontSize: 15, color: theme.textMuted }}>{' días seguidos'}</Text>
        </Text>
        <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]}>
          {streak > 0 ? 'Escribiendo en tu diario. ¡No rompas la racha!' : 'Escribe hoy para empezar tu racha.'}
        </Text>
      </View>
    </Card>
  );
}

export default function HoyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refresh } = useToday();
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' | 'pr' } | null>(null);
  const [showHabitSheet, setShowHabitSheet] = useState(false);
  const [writeStreak, setWriteStreak] = useState(0);

  // Racha de escritura (se recalcula al refrescar)
  useEffect(() => {
    diaryRepository.getWritingStreak().then(setWriteStreak).catch(() => {});
  }, [data, refresh]);

  const onToggleHabit = async (habitId: number) => {
    try {
      const done = await habitRepository.toggleHabit(habitId, todayISO());
      if (done) hapticService.success(); else hapticService.light();
      setToast({ message: done ? '✓ Hábito cumplido' : 'Hábito desmarcado', status: 'success' });
      await refresh();
    } catch {
      setToast({ message: 'No se pudo actualizar el hábito', status: 'error' });
    }
  };

  const onQuickMood = async (level: number) => {
    try {
      const date = todayISO();
      await diaryRepository.upsertEntry({ mood: level as 1 | 2 | 3 | 4 | 5 }, date);
      hapticService.success();
      setToast({ message: '✓ Día guardado', status: 'success' });
      await refresh();
    } catch {
      setToast({ message: 'No se pudo guardar (VALIDATION)', status: 'error' });
    }
  };

  const createQuickHabit = async (name: string, icon: string) => {
    try {
      await habitRepository.createHabit({ name, icon });
      setShowHabitSheet(false);
      await refresh();
    } catch {
      setToast({ message: 'No se pudo crear el hábito', status: 'error' });
    }
  };

  // ── Loading ──────────────────────────────────────────
  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
        <Skeleton height={26} style={{ width: '60%' }} />
        <Skeleton height={14} style={{ width: '40%', marginBottom: 24 }} />
        <Skeleton height={104} />
        <Skeleton height={158} />
        <Skeleton height={84} />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────
  if (error && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <EmptyState
          icon="⚠️"
          title="No pudimos abrir tu cuaderno"
          message="La base de datos no respondió. Tus datos están seguros en tu dispositivo."
          actionLabel="Reintentar"
          onAction={refresh}
        />
        <Toast message={`Error de base de datos (${error.code})`} status="error" visible onDismiss={() => {}} />
      </View>
    );
  }

  const date = data?.date ?? todayISO();
  const entry = data?.entry ?? null;
  const session = data?.session ?? null;
  const habits = data?.habits ?? [];

  // ── Empty (primera vez: sin nada registrado) ─────────
  const isEmpty = !entry && habits.length === 0 && !session;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Kicker>{kickerDate(date)}</Kicker>
            <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Buenos días</Text>
          </View>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              backgroundColor: theme.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: 'JetBrainsMono_700Bold', color: theme.primary }}>DF</Text>
          </View>
        </View>

        {/* Widget de racha animado */}
        <StreakHero streak={writeStreak} />

        {isEmpty ? (
          <EmptyState
            icon="📓"
            title="Tu cuaderno está esperando"
            message="Escribe tu primera línea hoy. Este será el comienzo de tu historia."
            actionLabel="Crear entrada de hoy"
            onAction={() => router.push('/diario')}
          />
        ) : (
          <>
            {/* Estado del día — MoodCard con ScaleSelector (HU-01, check-in rápido) */}
            <MoodCard moodColor={moodColors[moodToColorIndex(entry?.mood ?? null) ?? 2] ?? palette.primarySoft} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={[typeScale.bodySm, { color: theme.text }]}>
                  Energía <Text style={{ fontWeight: '700' }}>{entry?.energy ? `${entry.energy}/5` : '—'}</Text>
                </Text>
                <Text style={[typeScale.bodySm, { color: theme.textMuted }]}>
                  😴 {entry?.sleepHours != null ? `${entry.sleepHours} h` : '—'} · ⚖️{' '}
                  {entry?.bodyWeight != null ? `${entry.bodyWeight} kg` : '—'}
                </Text>
              </View>
              <Kicker style={{ marginBottom: 8 }}>ÁNIMO</Kicker>
              <ScaleSelector
                options={MOOD_EMOJIS}
                value={entry?.mood ?? null}
                onChange={onQuickMood}
                label="Ánimo"
                selectedColor={theme.primarySoft}
              />
            </MoodCard>

            {/* Gimnasio — GymCard */}
            <GymCard style={{ marginBottom: 14 }}>
              <Kicker variant="gym" style={{ marginBottom: 6 }}>
                {session ? 'SESIÓN EN CURSO' : 'ENTRENAMIENTO DE HOY'}
              </Kicker>
              <Text style={[typeScale.h3, { color: theme.text, marginBottom: 12 }]}>
                {session ? 'Continúa tu sesión' : 'Sin sesión todavía'}
              </Text>
              <Button
                label={session ? '▶ Continuar sesión' : '🏋️ Ir a Entrenar'}
                variant="gym"
                onPress={() => router.push(session ? `/sesion/${session.id}` : '/entrenar')}
              />
            </GymCard>

            {/* Hábitos — HU-10 */}
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Kicker>HÁBITOS</Kicker>
                <Badge variant="streak">
                  {`🔥 ${Math.max(0, ...habits.map((h: { streak: number }) => h.streak))} días`}
                </Badge>
              </View>
              <HabitsRow habits={habits} onToggle={onToggleHabit} />
              <Button label="＋ Añadir hábito" variant="ghost" onPress={() => setShowHabitSheet(true)} style={{ marginTop: 12 }} />
            </Card>

            {/* Diario rápido */}
            <Card>
              <Kicker style={{ marginBottom: 6 }}>DIARIO</Kicker>
              <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 12 }]}>
                {entry?.notes ? `"${entry.notes.slice(0, 80)}${entry.notes.length > 80 ? '…' : ''}"` : '"Hoy me siento…"'}
              </Text>
              <Button label="✏️ Escribir en el diario" onPress={() => router.push('/diario')} />
            </Card>
          </>
        )}
      </ScrollView>

      {/* Sheet de hábitos rápidos */}
      <Sheet visible={showHabitSheet} title="Añadir hábito" onClose={() => setShowHabitSheet(false)}>
        {[
          { name: 'Meditar', icon: '🧘' },
          { name: 'Agua 2L', icon: '💧' },
          { name: 'Estirar', icon: '🤸' },
          { name: 'Leer', icon: '📚' },
        ].map((h) => (
          <Button
            key={h.name}
            label={`${h.icon} ${h.name}`}
            variant="ghost"
            onPress={() => createQuickHabit(h.name, h.icon)}
            style={{ marginBottom: 10 }}
          />
        ))}
      </Sheet>

      <Toast
        message={toast?.message ?? ''}
        status={toast?.status ?? 'success'}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </View>
  );
}
