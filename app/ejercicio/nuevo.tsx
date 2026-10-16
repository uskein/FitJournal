import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Badge, Button, Card, EmptyState, Kicker, Toast } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';

const MUSCLES = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'glúteo', 'cardio', 'full body'];
const EQUIPMENT = ['barra', 'mancuerna', 'máquina', 'cable', 'peso corporal', 'banda', 'kettlebell'];
const ZONES = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'glúteo', 'cardio'];

function LevelPicker({ value, onChange, label, color }: { value: number | null; onChange: (v: number) => void; label: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: i <= (value ?? 0) ? color : theme.border }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Button key={i} label={String(i)} variant={value === i ? 'primary' : 'ghost'} onPress={() => onChange(i)} style={{ flex: 1, height: 36, paddingHorizontal: 0 }} />
        ))}
      </View>
    </View>
  );
}

function ChipRow({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const isSel = selected.includes(opt);
        return (
          <View key={opt} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: isSel ? theme.primarySoft : 'transparent', borderWidth: 1, borderColor: isSel ? theme.primary : theme.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? theme.primary : theme.textMuted }}>{opt}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function NuevoEjercicioScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [instructions, setInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<number | null>(null);
  const [effortLevel, setEffortLevel] = useState<number | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [benefits, setBenefits] = useState('');
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const toggleZone = (z: string) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

  const save = async () => {
    if (!name.trim() || !muscle) {
      setToast({ message: 'Nombre y músculo principal son obligatorios', status: 'error' });
      return;
    }
    try {
      let savedImagePath: string | null = null;
      if (imageUri) {
        const dir = new Directory(Paths.document, 'exercise-images');
        if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
        const dest = new File(dir, `${Date.now()}.jpg`);
        new File(imageUri).copy(dest);
        savedImagePath = dest.uri;
      }
      await workoutRepository.createCustomExercise({
        name: name.trim(),
        musclePrimary: muscle,
        equipment: equipment || null,
        instructions: instructions.trim() || null,
        videoUrl: videoUrl.trim() || null,
        imagePath: savedImagePath,
        skillLevel,
        effortLevel,
        muscleZones: zones.length > 0 ? zones.join(',') : null,
        healthBenefits: benefits.trim() || null,
      });
      setToast({ message: '✓ Ejercicio creado', status: 'success' });
      setTimeout(() => router.back(), 600);
    } catch {
      setToast({ message: 'No se pudo crear el ejercicio', status: 'error' });
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Kicker>NUEVO EJERCICIO</Kicker>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>
      <Text style={[typeScale.h1, { color: theme.text, marginBottom: 20 }]}>Crear ejercicio</Text>

      {/* Nombre */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>NOMBRE *</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Sentadilla goblet" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 16, color: theme.text, marginBottom: 14 }} />

      {/* Músculo principal */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>MÚSCULO PRINCIPAL *</Text>
      <ChipRow options={MUSCLES} selected={muscle ? [muscle] : []} onToggle={m => setMuscle(m === muscle ? '' : m)} />

      {/* Equipo */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, marginTop: 14 }]}>EQUIPO NECESARIO</Text>
      <ChipRow options={EQUIPMENT} selected={equipment ? [equipment] : []} onToggle={e => setEquipment(e === equipment ? '' : e)} />

      {/* Imagen */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, marginTop: 14 }]}>IMAGEN</Text>
      <Button label={imageUri ? '📷 Cambiar imagen' : '📷 Añadir imagen'} variant="ghost" onPress={pickImage} style={{ marginBottom: 8 }} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160, borderRadius: radius.lg, marginBottom: 14 }} />}

      {/* Video URL */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>URL DE VIDEO (YouTube, etc.)</Text>
      <TextInput value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtube.com/watch?v=..." placeholderTextColor={theme.textMuted} autoCapitalize="none" style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, marginBottom: 14 }} />

      {/* Niveles */}
      <LevelPicker label="NIVEL DE HABILIDAD" value={skillLevel} onChange={setSkillLevel} color={theme.primary} />
      <LevelPicker label="NIVEL DE ESFUERZO" value={effortLevel} onChange={setEffortLevel} color={theme.secondary} />

      {/* Zonas musculares */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>ZONAS TRABAJADAS</Text>
      <ChipRow options={ZONES} selected={zones} onToggle={toggleZone} />

      {/* Instrucciones */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4, marginTop: 14 }]}>INSTRUCCIONES / TÉCNICA</Text>
      <TextInput value={instructions} onChangeText={setInstructions} multiline placeholder="Describe la técnica correcta..." placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 14, minHeight: 100, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, textAlignVertical: 'top', marginBottom: 14 }} />

      {/* Beneficios de salud */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>💚 BENEFICIOS PARA LA SALUD</Text>
      <TextInput value={benefits} onChangeText={setBenefits} multiline placeholder="Fortalece huesos y articulaciones&#10;Mejora la postura" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 14, minHeight: 80, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, textAlignVertical: 'top', marginBottom: 20 }} />

      <Button label="💾 Crear ejercicio" onPress={save} />
      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
