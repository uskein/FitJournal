import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, BigData, Card, EmptyState, Kicker, Progress } from '@/ui';
import { statsService, type Correlation, type WeeklyVolume, type YearDay } from '@/services/statsService';
import { habitRepository } from '@/core/repositories/habitRepository';
import { todayISO } from '@/utils/dates';

/**
 * Tab Progreso — BLUEPRINTS §7 · 4 estados
 * BigData de mejor marca · volumen semanal · racha · correlaciones · Mi año.
 */

const MESES_C = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function ProgresoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [best, setBest] = useState<{ exercise: string; weight: number; reps: number } | null>(null);
  const [volume, setVolume] = useState<WeeklyVolume[]>([]);
  const [sessions, setSessions] = useState(0);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [year, setYear] = useState<YearDay[]>([]);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [b, v, s, c, y] = await Promise.all([
        statsService.bestLift(),
        statsService.weeklyVolume(8),
        statsService.totalSessions(),
        statsService.sleepVsEffort(),
        statsService.yearMap(now.getFullYear()),
      ]);
      setBest(b);
      setVolume(v);
      setSessions(s);
      setCorrelations(c ? [c] : []);
      setYear(y);
      // racha del primer hábito activo (simplificación)
      const habits = await habitRepository.listActiveHabits();
      if (habits[0]) setStreak(await habitRepository.getStreak(habits[0].id));
    } catch { /* estado vacío manejado */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>PROGRESO</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Tu evolución</Text>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ height: 120, borderRadius: 24, backgroundColor: theme.field, marginBottom: 12, opacity: 0.6 + i * 0.1 }} />
        ))}
      </View>
    );
  }

  const isEmpty = !best && sessions === 0 && streak === 0;

  const maxVol = Math.max(...volume.map((v) => v.sets), 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 40,
      }}
    >
      <Kicker>PROGRESO</Kicker>
      <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Tu evolución</Text>

      {isEmpty ? (
        <EmptyState
          icon="📈"
          title="Tu progreso empieza hoy"
          message="Cuando registres tus primeras series y días en el diario, aquí verás gráficas y correlaciones únicas."
        />
      ) : (
        <>
          {/* Mejor marca */}
          {best && (
            <Card style={{ marginBottom: 14 }}>
              <Kicker variant="gym" style={{ marginBottom: 6 }}>TU MEJOR MARCA</Kicker>
              <BigData size="xl" color={theme.secondary}>{`${best.weight} KG × ${best.reps}`}</BigData>
              <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 4 }]}>{best.exercise}</Text>
            </Card>
          )}

          {/* Resumen */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <Card style={{ flex: 1 }}>
              <Kicker style={{ marginBottom: 4 }}>SESIONES</Kicker>
              <BigData size="lg" color={theme.primary}>{String(sessions)}</BigData>
            </Card>
            <Card style={{ flex: 1 }}>
              <Kicker style={{ marginBottom: 4 }}>RACHA</Kicker>
              <BigData size="lg" color={theme.accent}>{`${streak}d`}</BigData>
            </Card>
          </View>

          {/* Volumen semanal */}
          {volume.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <Kicker style={{ marginBottom: 12 }}>VOLUMEN SEMANAL (series)</Kicker>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 }}>
                {volume.map((v, i) => (
                  <View
                    key={v.week}
                    style={{
                      flex: 1,
                      height: `${Math.max(8, (v.sets / maxVol) * 100)}%`,
                      borderRadius: 8,
                      backgroundColor: i === volume.length - 1 ? theme.secondary : theme.primarySoft,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>hace 8 sem</Text>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>actual</Text>
              </View>
            </Card>
          )}

          {/* Correlaciones — diferencial HU-08 */}
          {correlations.map((c, i) => (
            <Card key={i} style={{ marginBottom: 14, backgroundColor: theme.mode === 'dark' ? theme.elevated : `${theme.primary}12` }}>
              <Kicker style={{ marginBottom: 6 }}>{`💡 ${c.title.toUpperCase()}`}</Kicker>
              <Text style={[typeScale.bodySm, { color: theme.text }]}>{c.insight}</Text>
            </Card>
          ))}

          {/* Mi año — mood map */}
          <Card style={{ marginBottom: 14 }}>
            <Kicker style={{ marginBottom: 12 }}>MI AÑO</Kicker>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
              {year.map((d) => (
                <View
                  key={d.date}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    backgroundColor: d.color ?? (d.hasWorkout ? `${theme.secondary}88` : theme.border),
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: theme.border }} />
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>sin datos</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: `${theme.secondary}88` }} />
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>gym</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: theme.success }} />
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>ánimo</Text>
              </View>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
