import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, BigData, Button, Card, EmptyState, Kicker, Sheet, Toast } from '@/ui';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { diaryRepository } from '@/core/repositories/diaryRepository';
import { habitRepository } from '@/core/repositories/habitRepository';

export default function PerfilScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [sessions, setSessions] = useState(0);
  const [entries, setEntries] = useState(0);
  const [habits, setHabits] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [n, w, g, av, s, e, h] = await Promise.all([
        settingsRepository.get('user_name'),
        settingsRepository.get('user_weight'),
        settingsRepository.get('user_goal'),
        settingsRepository.get('user_avatar'),
        workoutRepository.getActiveSession(new Date().toISOString().slice(0, 10)).then(() => 0).catch(() => 0),
        diaryRepository.listEntriesByRange('2000-01-01', new Date().toISOString().slice(0, 10)).then(r => r.length),
        habitRepository.listActiveHabits(),
      ]);
      setName(n ?? '');
      setWeight(w ?? '');
      setGoal(g ?? '');
      setAvatarUri(av ?? null);
      setSessions(s);
      setEntries(e);
      setHabits(h.length);
      if (h[0]) setStreak(await habitRepository.getStreak(h[0].id));
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
    await settingsRepository.set('user_name', name);
    await settingsRepository.set('user_weight', weight);
    await settingsRepository.set('user_goal', goal);
    setToast({ message: '✓ Perfil guardado', status: 'success' });
  };

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
      <Kicker>PERFIL</Kicker>
      <Text style={[typeScale.h1, { color: theme.text, marginTop: 4, marginBottom: 20 }]}>Tu perfil</Text>

      {/* Avatar */}
      <Card style={{ alignItems: 'center', marginBottom: 16 }}>
        <Button
          label={avatarUri ? 'Cambiar foto' : 'Añadir foto'}
          variant="ghost"
          onPress={pickAvatar}
          style={{ marginBottom: 12 }}
        />
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        ) : (
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 36 }}>📷</Text>
          </View>
        )}
      </Card>

      {/* Datos */}
      <Card style={{ marginBottom: 16 }}>
        <Kicker style={{ marginBottom: 10 }}>DATOS</Kicker>
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Nombre</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text, marginBottom: 12 }} />
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Peso actual (kg)</Text>
        <TextInput value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="70.5" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: theme.text, marginBottom: 12 }} />
        <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>Meta / objetivo</Text>
        <TextInput value={goal} onChangeText={setGoal} placeholder="Ganar músculo, bajar grasa..." placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 46, fontFamily: 'NunitoSans_400Regular', fontSize: 15, color: theme.text }} />
        <Button label="Guardar perfil" onPress={save} style={{ marginTop: 14 }} />
      </Card>

      {/* Estadísticas */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>ESTADÍSTICAS</Kicker>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <BigData size="lg" color={theme.primary}>{String(entries)}</BigData>
            <Text style={[typeScale.caption, { color: theme.textMuted }]}>Días escritos</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <BigData size="lg" color={theme.secondary}>{String(habits)}</BigData>
            <Text style={[typeScale.caption, { color: theme.textMuted }]}>Hábitos</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <BigData size="lg" color={theme.accent}>{`${streak}d`}</BigData>
            <Text style={[typeScale.caption, { color: theme.textMuted }]}>Racha</Text>
          </View>
        </View>
      </Card>

      {/* Medidas corporales */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 10 }}>CUERPO</Kicker>
        <Button label="📐 Medidas corporales" variant="ghost" onPress={() => router.push('/medidas')} />
      </Card>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
