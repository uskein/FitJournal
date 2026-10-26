import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Sheet, Toast } from '@/ui';
import { weeklyPlanRepository, dayName, mondayOf, type WeeklyPlan, type WeeklyPlanItem, type WeekProgress } from '@/core/repositories/weeklyPlanRepository';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { pdfService } from '@/services/pdfService';
import { hapticService } from '@/services/hapticService';
import type { Routine } from '@/core/types';

/**
 * Mi Semana — planificador de rutinas semanales.
 * - Crea (o navega) planes semanales (lunes a domingo).
 * - Asigna rutinas a días (1=lun..7=dom).
 * - Muestra progreso real (sesiones completadas vs planificadas) + datos de la semana.
 * - Exporta el plan + progreso a PDF.
 */

const DOW_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function MiSemanaScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [items, setItems] = useState<WeeklyPlanItem[]>([]);
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet asignar rutina
  const [showAssign, setShowAssign] = useState(false);
  const [assignDay, setAssignDay] = useState(1);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const todayISO = new Date().toISOString().slice(0, 10);
  const { start: thisWeekStart } = mondayOf(todayISO);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, rs] = await Promise.all([weeklyPlanRepository.listPlans(), workoutRepository.listRoutines()]);
      setPlans(ps);
      setRoutines(rs);

      // Plan de esta semana como default (crearlo si no existe)
      let plan = await weeklyPlanRepository.getPlanByWeekStart(thisWeekStart);
      if (!plan) plan = await weeklyPlanRepository.ensurePlan(thisWeekStart);
      setCurrentPlan(plan);
      const its = await weeklyPlanRepository.getItems(plan.id);
      setItems(its);
      setProgress(await weeklyPlanRepository.getWeekProgress(plan, its));
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, [thisWeekStart]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectPlan = async (p: WeeklyPlan) => {
    setCurrentPlan(p);
    const its = await weeklyPlanRepository.getItems(p.id);
    setItems(its);
    setProgress(await weeklyPlanRepository.getWeekProgress(p, its));
  };

  const openAssign = (day: number) => {
    if (routines.length === 0) {
      Alert.alert('No tienes rutinas', 'Crea una rutina primero en la pestaña Entrenar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir a Entrenar', onPress: () => router.push('/entrenar') },
      ]);
      return;
    }
    setAssignDay(day);
    setShowAssign(true);
  };

  const assign = async (routineId: number) => {
    if (!currentPlan) return;
    try {
      await weeklyPlanRepository.addItem(currentPlan.id, routineId, assignDay);
      hapticService.success();
      setShowAssign(false);
      await selectPlan(currentPlan);
      setToast({ message: '✓ Rutina asignada', status: 'success' });
    } catch {
      setToast({ message: 'Ya estaba asignada ese día', status: 'error' });
    }
  };

  const removeItem = (item: WeeklyPlanItem) => {
    Alert.alert('¿Quitar del plan?', `${item.routineName} el ${dayName(item.dayOfWeek)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive',
        onPress: async () => {
          await weeklyPlanRepository.removeItem(item.id);
          if (currentPlan) await selectPlan(currentPlan);
          hapticService.light();
        },
      },
    ]);
  };

  const exportPdf = async () => {
    if (!currentPlan || !progress) return;
    try {
      const uri = await pdfService.exportWeeklyPlan(currentPlan, items, progress);
      await pdfService.share(uri);
      setToast({ message: '📄 Plan semanal exportado', status: 'success' });
    } catch {
      setToast({ message: 'No se pudo exportar', status: 'error' });
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>MI SEMANA</Kicker>
        {[1, 2, 3].map(i => <View key={i} style={{ height: 80, borderRadius: 20, backgroundColor: theme.field, marginBottom: 12, opacity: 0.6 + i * 0.1 }} />)}
      </View>
    );
  }

  const isCurrentWeek = currentPlan?.weekStart === thisWeekStart;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <Kicker>PLANIFICADOR</Kicker>
        <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Mi semana</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        {/* Selector de semana */}
        {plans.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -20, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {plans.map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => { hapticService.light(); selectPlan(p); }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
                    backgroundColor: currentPlan?.id === p.id ? theme.primary : theme.field,
                    borderWidth: 1.5, borderColor: currentPlan?.id === p.id ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: currentPlan?.id === p.id ? '#fff' : theme.textMuted }}>
                    {p.weekStart.slice(8)}/{p.weekStart.slice(5, 7)}
                  </Text>
                  {p.weekStart === thisWeekStart && <Text style={{ fontSize: 9, color: currentPlan?.id === p.id ? '#fff' : theme.primary, fontWeight: '700' }}>ESTA</Text>}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Progreso de la semana */}
        {currentPlan && progress && (
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Kicker variant="gym">{isCurrentWeek ? '📅 ESTA SEMANA' : `📅 SEMANA ${currentPlan.weekStart.slice(8)}/${currentPlan.weekStart.slice(5, 7)}`}</Kicker>
              <Badge variant={progress.completionPct >= 80 ? 'pr' : 'tag'}>{`${progress.completionPct}% cumplido`}</Badge>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: theme.secondarySoft, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <BigData size="md" color={theme.secondary}>{`${progress.completedCount}/${progress.plannedCount}`}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Días cumplidos</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.primarySoft, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <BigData size="md" color={theme.primary}>{String(progress.totalSessions)}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Sesiones</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: theme.field, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <BigData size="md" color={theme.accent}>{String(progress.totalSets)}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Series</Text>
              </View>
            </View>

            {progress.totalVolume > 0 && (
              <View style={{ backgroundColor: theme.field, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 10 }}>
                <BigData size="md" color={theme.primary}>{progress.totalVolume.toLocaleString()}</BigData>
                <Text style={[typeScale.caption, { color: theme.textMuted }]}>Volumen total (kg × reps)</Text>
              </View>
            )}

            {progress.completedRoutines.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {progress.completedRoutines.map((r, i) => <Badge key={i} variant="habit">{`✓ ${r}`}</Badge>)}
              </View>
            )}
          </Card>
        )}

        {/* Plan día a día */}
        {currentPlan && (
          <Card style={{ marginBottom: 14 }}>
            <Kicker style={{ marginBottom: 10 }}>🗓️ PLAN DE RUTINAS</Kicker>
            {DOW_LETTERS.map((letter, idx) => {
              const day = idx + 1;
              const dayItems = items.filter(i => i.dayOfWeek === day);
              const [y, m, d] = currentPlan.weekStart.split('-').map(Number) as [number, number, number];
              const dt = new Date(y, m - 1, d + idx);
              const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
              const done = progress?.completedDates.includes(iso) ?? false;

              return (
                <Pressable
                  key={day}
                  onPress={() => openAssign(day)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
                    borderRadius: 12, marginBottom: 8,
                    backgroundColor: done ? `${theme.secondary}14` : theme.field,
                    borderWidth: 1.5, borderColor: done ? theme.secondary : 'transparent',
                  }}
                >
                  <View style={{ width: 36, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textMuted }}>{letter}</Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{dt.getDate()}</Text>
                  </View>
                  <View style={{ width: 22, alignItems: 'center' }}>
                    {done ? <Text style={{ fontSize: 14 }}>✅</Text> : <Text style={{ fontSize: 14, color: theme.border }}>○</Text>}
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    {dayItems.length === 0 ? (
                      <Text style={[typeScale.bodySm, { color: theme.textMuted, fontStyle: 'italic' }]}>Descanso — toca para asignar</Text>
                    ) : (
                      dayItems.map(item => (
                        <Pressable key={item.id} onLongPress={() => removeItem(item)} style={{ marginBottom: 2 }}>
                          <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '600' }]}>{`• ${item.routineName}`}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                  <Text style={{ fontSize: 16, color: theme.primary }}>＋</Text>
                </Pressable>
              );
            })}
            <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>Toca un día para asignar rutina · mantén pulsada para quitar</Text>
          </Card>
        )}

        {/* Acciones */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <Button label="📄 Exportar plan" variant="gym" onPress={exportPdf} style={{ flex: 1 }} />
          <Button label="🔄 Actualizar" variant="ghost" onPress={load} style={{ flex: 1 }} />
        </View>

        <Button label="➕ Nueva semana (la siguiente)" variant="ghost" onPress={async () => {
          const [y, m, d] = (currentPlan?.weekEnd ?? todayISO).split('-').map(Number) as [number, number, number];
          const nextMon = new Date(y, m - 1, d + 1);
          const iso = `${nextMon.getFullYear()}-${String(nextMon.getMonth() + 1).padStart(2, '0')}-${String(nextMon.getDate()).padStart(2, '0')}`;
          const p = await weeklyPlanRepository.ensurePlan(iso);
          await load();
          await selectPlan(p);
          hapticService.success();
        }} style={{ marginBottom: 10 }} />

        {/* Historial */}
        {plans.length > 1 && (
          <Card>
            <Kicker style={{ marginBottom: 8 }}>📚 PLANES ANTERIORES</Kicker>
            {plans.filter(p => p.id !== currentPlan?.id).map(p => (
              <Pressable key={p.id} onPress={() => selectPlan(p)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '600' }]}>{`${p.weekStart} → ${p.weekEnd}`}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        {/* Estado vacío global */}
        {routines.length === 0 && (
          <EmptyState icon="🗓️" title="Empieza a planificar" message="Crea una rutina en Entrenar y asígnala a los días de tu semana." actionLabel="➕ Crear rutina" onAction={() => router.push('/rutina/nueva')} />
        )}
      </ScrollView>

      {/* Sheet asignar rutina a un día */}
      <Sheet visible={showAssign} title={`Asignar rutina — ${dayName(assignDay)}`} onClose={() => setShowAssign(false)}>
        {routines.map(r => (
          <Pressable
            key={r.id}
            onPress={() => assign(r.id)}
            style={{ paddingVertical: 14, paddingHorizontal: 14, backgroundColor: theme.field, borderRadius: radius.md, marginBottom: 8 }}
          >
            <Text style={[typeScale.bodySm, { color: theme.text, fontWeight: '700' }]}>{r.name}</Text>
            {r.description && <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2 }]} numberOfLines={1}>{r.description}</Text>}
          </Pressable>
        ))}
        <Button label="➕ Crear rutina nueva" variant="ghost" onPress={() => { setShowAssign(false); router.push('/rutina/nueva'); }} style={{ marginTop: 8 }} />
      </Sheet>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </View>
  );
}
