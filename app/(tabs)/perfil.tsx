import React, { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { BigData, Button, Card, Kicker, Toast } from '@/ui';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { habitRepository } from '@/core/repositories/habitRepository';
import { statsService } from '@/services/statsService';
import { bodyMeasurementService, type BodyMeasurement } from '@/services/bodyMeasurementService';
import { exportService } from '@/services/exportService';
import { backupReminderService } from '@/services/backupReminderService';
import { isoDayOffset, todayISO } from '@/utils/dates';

/**
 * Perfil — identidad, datos, estadísticas, insignias y accesos rápicos.
 * Ajustes (tema/biométrico/respaldo) vive en /ajustes y se abre con ⚙️.
 */

/** Racha de escritura: días consecutivos con entrada, contando desde hoy (o ayer si hoy aún no hay) */
function computeWritingStreak(entryDates: string[]): number {
  const set = new Set(entryDates);
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const d = new Date();
  let k = key(d);
  if (!set.has(k)) {
    d.setDate(d.getDate() - 1);
    k = key(d);
    if (!set.has(k)) return 0;
  }
  let n = 0;
  while (set.has(k)) {
    n++;
    d.setDate(d.getDate() - 1);
    k = key(d);
  }
  return n;
}

export default function PerfilScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [entries, setEntries] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [habits, setHabits] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastMeasure, setLastMeasure] = useState<BodyMeasurement | null>(null);
  const [exporting, setExporting] = useState<'backup' | 'report' | 'profile' | null>(null);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);
  const origRef = useRef({ name: '', weight: '', goal: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [n, w, g, av, entryList, activeHabits, totalSessions, lastM] = await Promise.all([
        settingsRepository.get('user_name'),
        settingsRepository.get('user_weight'),
        settingsRepository.get('user_goal'),
        settingsRepository.get('user_avatar'),
        diaryRepository.listEntriesByRange('2000-01-01', todayISO()),
        habitRepository.listActiveHabits(),
        statsService.totalSessions(),
        bodyMeasurementService.latest(),
      ]);
      setName(n ?? '');
      setWeight(w ?? '');
      setGoal(g ?? '');
      setAvatarUri(av ?? null);
      origRef.current = { name: n ?? '', weight: w ?? '', goal: g ?? '' };
      setEntries(entryList.length);
      setHabits(activeHabits.length);
      setSessions(totalSessions);
      setStreak(computeWritingStreak(entryList.map(e => e.entryDate)));
      setLastMeasure(lastM);
    } catch { /* vacío */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setToast({ message: 'Permiso denegado', status: 'error' }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const dir = new Directory(Paths.document, 'avatar');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const dest = new File(dir, 'avatar.jpg');
    new File(result.assets[0].uri).copy(dest);
    setAvatarUri(dest.uri);
    await settingsRepository.set('user_avatar', dest.uri);
    setToast({ message: '✓ Foto actualizada', status: 'success' });
  };

  const save = async () => {
    const n = name.trim();
    if (n.length > 40) { setToast({ message: 'Nombre máximo 40 caracteres', status: 'error' }); return; }

    const wRaw = weight.trim().replace(',', '.');
    let wNorm = '';
    if (wRaw !== '') {
      const num = parseFloat(wRaw);
      if (isNaN(num) || num < 20 || num > 300) {
        setToast({ message: 'Peso debe estar entre 20 y 300 kg', status: 'error' });
        return;
      }
      wNorm = String(Math.round(num * 10) / 10);
    }

    const g = goal.trim();
    const o = origRef.current;
    if (n === o.name && wNorm === o.weight.trim().replace(',', '.') && g === o.goal) {
      setToast({ message: 'Sin cambios que guardar', status: 'success' });
      return;
    }

    await settingsRepository.set('user_name', n);
    await settingsRepository.set('user_weight', wNorm);
    await settingsRepository.set('user_goal', g);
    origRef.current = { name: n, weight: wNorm, goal: g };
    setName(n);
    setWeight(wNorm);
    setGoal(g);
    setToast({ message: '✓ Perfil guardado', status: 'success' });
  };

  const doBackup = async () => {
    setExporting('backup');
    try {
      const uri = await exportService.exportBackup();
      await backupReminderService.markBackup();
      setToast({ message: `📤 Respaldo listo: ${uri.split('/').pop()}`, status: 'success' });
    } catch {
      setToast({ message: 'No se pudo generar el respaldo', status: 'error' });
    } finally { setExporting(null); }
  };

  const doReport = async () => {
    setExporting('report');
    try {
      const { pdfService } = await import('@/services/pdfService');
      const uri = await pdfService.exportReport(isoDayOffset(-29), todayISO());
      await pdfService.share(uri);
      setToast({ message: '📊 Informe exportado', status: 'success' });
    } catch {
      setToast({ message: 'No se pudo generar el informe', status: 'error' });
    } finally { setExporting(null); }
  };

  const doProfileExport = async () => {
    setExporting('profile');
    try {
      const { pdfService } = await import('@/services/pdfService');
      const uri = await pdfService.exportProfile();
      await pdfService.share(uri);
      setToast({ message: '🪪 Perfil exportado', status: 'success' });
    } catch {
      setToast({ message: 'No se pudo exportar el perfil', status: 'error' });
    } finally { setExporting(null); }
  };

  const badges = [
    { icon: '✍️', label: 'Primer paso', earned: entries >= 1 },
    { icon: '🔥', label: 'Racha 7 días', earned: streak >= 7 },
    { icon: '📓', label: '30 entradas', earned: entries >= 30 },
    { icon: '📚', label: '100 entradas', earned: entries >= 100 },
    { icon: '🏋️', label: '10 sesiones', earned: sessions >= 10 },
    { icon: '💪', label: '50 sesiones', earned: sessions >= 50 },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <Kicker>PERFIL</Kicker>
        {[1, 2, 3].map(i => <View key={i} style={{ height: 100, borderRadius: 24, backgroundColor: theme.field, marginBottom: 12, opacity: 0.6 + i * 0.1 }} />)}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      {/* Header + acceso a Ajustes */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Kicker>PERFIL</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Tu perfil</Text>
        </View>
        <Button
          label="⚙️"
          variant="ghost"
          onPress={() => router.push('/ajustes')}
          style={{ width: 48, paddingHorizontal: 0 }}
          accessibilityLabel="Abrir ajustes"
        />
      </View>

      {/* Identidad: avatar → nombre/meta → cambiar foto */}
      <Card style={{ alignItems: 'center', marginBottom: 16 }}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36 }}>📷</Text>
          </View>
        )}
        {name.trim() !== '' && (
          <Text style={[typeScale.h3, { color: theme.text, marginTop: 10, textAlign: 'center' }]}>{name.trim()}</Text>
        )}
        {goal.trim() !== '' && (
          <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 2, textAlign: 'center' }]}>{goal.trim()}</Text>
        )}
        <Button
          label={avatarUri ? 'Cambiar foto' : 'Añadir foto'}
          variant="ghost"
          onPress={pickAvatar}
          style={{ marginTop: 12 }}
        />
      </Card>

      {/* Datos */}
      <Card style={{ marginBottom: 16 }}>
        <Kicker style={{ marginBottom: 10 }}>DATOS</Kicker>
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={40}
          placeholder="Tu nombre"
          placeholderTextColor={theme.textMuted}
          style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 12 }}
        />
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Peso actual (kg)</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="70.5"
          placeholderTextColor={theme.textMuted}
          style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: theme.text, marginBottom: 6 }}
        />
        {lastMeasure && (
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 12 }]}>
            {`Última medida: ${lastMeasure.weight != null ? `${lastMeasure.weight} kg` : '—'} · ${lastMeasure.date}`}
          </Text>
        )}
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Meta / objetivo</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          maxLength={80}
          placeholder="Ganar músculo, bajar grasa..."
          placeholderTextColor={theme.textMuted}
          style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text }}
        />
        <Button label="Guardar perfil" onPress={save} style={{ marginTop: 14 }} />
      </Card>

      {/* Estadísticas */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>ESTADÍSTICAS</Kicker>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            { v: String(entries), l: 'Días escritos', c: theme.primary },
            { v: String(sessions), l: 'Sesiones', c: theme.secondary },
            { v: String(habits), l: 'Hábitos', c: theme.accent },
            { v: `${streak}d`, l: 'Racha escritura', c: '#C67B5C' },
          ].map(s => (
            <View key={s.l} style={{ minWidth: '44%', flexGrow: 1, alignItems: 'center', backgroundColor: theme.field, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 8 }}>
              <BigData size="lg" color={s.c}>{s.v}</BigData>
              <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 2, textAlign: 'center' }]}>{s.l}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Insignias */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>INSIGNIAS</Kicker>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {badges.map(b => (
            <View
              key={b.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: b.earned ? theme.primarySoft : theme.field,
                borderRadius: 99,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 14 }}>{b.earned ? b.icon : '🔒'}</Text>
              <Text
                style={[
                  typeScale.caption,
                  { color: b.earned ? theme.primary : theme.textMuted, fontWeight: b.earned ? '700' : '400' },
                ]}
              >
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Accesos rápidos */}
      <Card>
        <Kicker style={{ marginBottom: 12 }}>ACCESOS RÁPIDOS</Kicker>
        <Button
          label="📐 Medidas corporales"
          variant="ghost"
          onPress={() => router.push('/medidas')}
          style={{ marginBottom: 10 }}
        />
        <Button
          label={exporting === 'profile' ? '⏳ Generando perfil…' : '🪪 Exportar perfil (PDF)'}
          variant="ghost"
          onPress={doProfileExport}
          disabled={exporting !== null}
          style={{ marginBottom: 10 }}
        />
        <Button
          label={exporting === 'backup' ? '⏳ Generando respaldo…' : '📤 Exportar respaldo (JSON + ZIP)'}
          variant="ghost"
          onPress={doBackup}
          disabled={exporting !== null}
          style={{ marginBottom: 10 }}
        />
        <Button
          label={exporting === 'report' ? '⏳ Generando informe…' : '📊 Informe PDF (30 días)'}
          variant="ghost"
          onPress={doReport}
          disabled={exporting !== null}
        />
      </Card>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
