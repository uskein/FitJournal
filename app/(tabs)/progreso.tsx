import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Sheet, Toast } from '@/ui';
import { statsService, type Correlation, type YearDay } from '@/services/statsService';
import { weeklySummaryService, type WeeklySummary } from '@/services/weeklySummaryService';
import { habitRepository } from '@/core/repositories/habitRepository';
import { pdfService } from '@/services/pdfService';
import { getDatabase } from '@/core/db/database';
import { todayISO } from '@/utils/dates';

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface WorkoutDay { date: string; exercises: string[]; sets: number; duration: number | null; }

export default function ProgresoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [best, setBest] = useState<{ exercise: string; weight: number; reps: number } | null>(null);
  const [sessions, setSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [year, setYear] = useState<YearDay[]>([]);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear] = useState(new Date().getFullYear());
  const [workoutDays, setWorkoutDays] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const [weekly, setWeekly] = useState<WeeklySummary | null>(null);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [b, s, c, y] = await Promise.all([
        statsService.bestLift(), statsService.totalSessions(), statsService.sleepVsEffort(), statsService.yearMap(now.getFullYear()),
      ]);
      setBest(b); setSessions(s); setCorrelations(c ? [c] : []); setYear(y);
      const habits = await habitRepository.listActiveHabits();
      if (habits[0]) setStreak(await habitRepository.getStreak(habits[0].id));

      // Resumen semanal
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setWeekly(await weeklySummaryService.getSummary(fmt(weekStart), fmt(weekEnd)));

      // Workout days del mes actual
      const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
      const to = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const db = await getDatabase();
      const rows = await db.getAllAsync<{ session_date: string }>(
        'SELECT DISTINCT session_date FROM workout_sessions WHERE session_date BETWEEN ? AND ? AND finished_at IS NOT NULL', [from, to],
      );
      setWorkoutDays(new Set(rows.map(r => r.session_date)));
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, [calMonth, calYear]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDay = async (date: string) => {
    const db = await getDatabase();
    const session = await db.getFirstAsync<{ id: number; duration_min: number | null }>(
      'SELECT id, duration_min FROM workout_sessions WHERE session_date = ? AND finished_at IS NOT NULL', [date],
    );
    if (!session) return;
    const exercises = await db.getAllAsync<{ name: string }>(
      `SELECT e.name FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`, [session.id],
    );
    const sets = await db.getAllAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id WHERE se.session_id = ? AND ss.is_completed = 1`, [session.id],
    );
    setSelectedDay({ date, exercises: exercises.map(e => e.name), sets: sets[0]?.n ?? 0, duration: session.duration_min });
    setShowDaySheet(true);
  };

  const exportDayPdf = async (date: string) => {
    try {
      const uri = await pdfService.exportDay(date);
      await pdfService.share(uri);
      setToast({ message: '📄 PDF exportado', status: 'success' });
    } catch { setToast({ message: 'No se pudo exportar', status: 'error' }); }
  };

  const prevMonth = () => setCalMonth(m => m === 0 ? 11 : m - 1);
  const nextMonth = () => setCalMonth(m => m === 11 ? 0 : m + 1);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>PROGRESO</Kicker>
        {[1, 2, 3].map(i => <View key={i} style={{ height: 120, borderRadius: 24, backgroundColor: theme.field, marginBottom: 12, opacity: 0.6 + i * 0.1 }} />)}
      </View>
    );
  }

  const isEmpty = !best && sessions === 0;

  // Calendar cells
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = [...Array.from({ length: startOffset }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      <Kicker>PROGRESO</Kicker>
      <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Tu evolución</Text>

      {isEmpty ? (
        <EmptyState icon="📈" title="Tu progreso empieza hoy" message="Registra tu primera sesión de gym para ver estadísticas." />
      ) : (
        <>
          {best && (
            <Card style={{ marginBottom: 14 }}>
              <Kicker variant="gym" style={{ marginBottom: 6 }}>TU MEJOR MARCA</Kicker>
              <BigData size="xl" color={theme.secondary}>{`${best.weight} KG × ${best.reps}`}</BigData>
              <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 4 }]}>{best.exercise}</Text>
            </Card>
          )}

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

          {/* Calendario de entrenamientos */}
          <Card style={{ marginBottom: 14, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Button label="←" variant="ghost" onPress={prevMonth} style={{ width: 44, height: 40, paddingHorizontal: 0 }} />
              <Text style={[typeScale.h3, { color: theme.text }]}>{MESES[calMonth]} {calYear}</Text>
              <Button label="→" variant="ghost" onPress={nextMonth} style={{ width: 44, height: 40, paddingHorizontal: 0 }} />
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DOW.map(d => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1 }}>{d}</Text>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((day, i) => {
                if (day === null) return <View key={`x${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }} />;
                const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasWorkout = workoutDays.has(iso);
                const isToday = iso === todayISO();
                return (
                  <Pressable key={iso} onPress={() => hasWorkout && openDay(iso)} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
                    <View style={{ flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: hasWorkout ? theme.secondary : theme.field, borderWidth: isToday ? 2 : 0, borderColor: isToday ? theme.primary : 'transparent' }}>
                      <Text style={{ fontSize: 13, fontWeight: hasWorkout ? '700' : '400', color: hasWorkout ? '#fff' : theme.textMuted }}>{day}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: theme.secondary }} />
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Entrenaste</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: theme.field, borderWidth: 2, borderColor: theme.primary }} />
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Hoy</Text>
              </View>
            </View>
          </Card>

          {/* Resumen semanal */}
          {weekly && (
            <Card style={{ marginBottom: 14 }}>
              <Kicker style={{ marginBottom: 10 }}>📅 ESTA SEMANA</Kicker>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ backgroundColor: theme.secondarySoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                  <BigData size="md" color={theme.secondary}>{String(weekly.gymSessions)}</BigData>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Gym</Text>
                </View>
                <View style={{ backgroundColor: theme.primarySoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                  <BigData size="md" color={theme.primary}>{String(weekly.diaryEntries)}</BigData>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Diario</Text>
                </View>
                <View style={{ backgroundColor: theme.accentSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                  <BigData size="md" color={theme.accent}>{String(weekly.habitsDone)}</BigData>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Hábitos</Text>
                </View>
                <View style={{ backgroundColor: theme.field, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' }}>
                  <BigData size="md" color={theme.primary}>{String(weekly.totalSets)}</BigData>
                  <Text style={[typeScale.caption, { color: theme.textMuted }]}>Series</Text>
                </View>
              </View>
              {(weekly.avgSleep || weekly.avgMood) && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  {weekly.avgSleep && <Text style={[typeScale.bodySm, { color: theme.textMuted }]}>😴 Sueño: <b style={{ color: theme.text }}>{weekly.avgSleep}h</b></Text>}
                  {weekly.avgMood && <Text style={[typeScale.bodySm, { color: theme.textMuted }]}>🙂 Ánimo: <b style={{ color: theme.text }}>{weekly.avgMood}/5</b></Text>}
                </View>
              )}
              <Button label="📄 Exportar semana a PDF" variant="ghost" onPress={async () => {
                try {
                  const now = new Date();
                  const label = `Semana del ${now.getDate()} ${MESES[now.getMonth()]}`;
                  const uri = await pdfService.exportWeeklySummary(weekly, label);
                  await pdfService.share(uri);
                  setToast({ message: '📄 PDF exportado', status: 'success' });
                } catch { setToast({ message: 'No se pudo exportar', status: 'error' }); }
              }} style={{ marginTop: 12 }} />
            </Card>
          )}

          {/* Correlaciones */}
          {correlations.map((c, i) => (
            <Card key={i} style={{ marginBottom: 14, backgroundColor: theme.mode === 'dark' ? theme.elevated : `${theme.primary}12` }}>
              <Kicker style={{ marginBottom: 6 }}>{`💡 ${c.title.toUpperCase()}`}</Kicker>
              <Text style={[typeScale.bodySm, { color: theme.text }]}>{c.insight}</Text>
            </Card>
          ))}

          {/* Mi año */}
          <Card style={{ marginBottom: 14 }}>
            <Kicker style={{ marginBottom: 12 }}>MI AÑO</Kicker>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
              {year.map(d => (
                <View key={d.date} style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: d.color ?? (d.hasWorkout ? `${theme.secondary}88` : theme.border) }} />
              ))}
            </View>
          </Card>

          {/* Export PDF del día seleccionado */}
          {selectedDay && (
            <Card style={{ marginBottom: 14 }}>
              <Kicker style={{ marginBottom: 8 }}>{`DÍA: ${selectedDay.date}`}</Kicker>
              <Text style={[typeScale.bodySm, { color: theme.text, marginBottom: 4 }]}>{`${selectedDay.duration ?? '?'} min · ${selectedDay.exercises.length} ejercicios · ${selectedDay.sets} series`}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                {selectedDay.exercises.map((e, i) => <Badge key={i} variant="pr">{e}</Badge>)}
              </View>
              <Button label="📄 Exportar día a PDF" onPress={() => exportDayPdf(selectedDay.date)} />
            </Card>
          )}
        </>
      )}

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
