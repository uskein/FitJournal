import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius } from '@/theme/tokens';
import { Button, Kicker, Toast } from '@/ui';
import { workoutRepository } from '@/core/repositories/workoutRepository';
import { hapticService } from '@/services/hapticService';

const MUSCLES = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'glúteo', 'cardio', 'full body'];
const EQUIPMENT = ['barra', 'mancuerna', 'máquina', 'cable', 'peso corporal', 'banda', 'kettlebell'];
const ZONES = ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'core', 'glúteo', 'cardio'];
const TYPES = ['compuesto', 'aislamiento'];

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
          <Button key={i} label={String(i)} variant={value === i ? 'primary' : 'ghost'} onPress={() => onChange(value === i ? 0 : i)} style={{ flex: 1, height: 36, paddingHorizontal: 0 }} accessibilityLabel={`${label} ${i}`} />
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
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: isSel ? theme.primarySoft : 'transparent', borderWidth: 1.5, borderColor: isSel ? theme.primary : theme.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: isSel ? theme.primary : theme.textMuted }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Formulario de ejercicio con doble modo:
 *  - Crear: /ejercicio/nuevo
 *  - Editar: /ejercicio/nuevo?edit=<id> (cualquier ejercicio, incluidos los precargados)
 */
export default function EjercicioFormScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = edit ? Number(edit) : null;
  const isEdit = editId !== null && !Number.isNaN(editId);

  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [muscleSecondary, setMuscleSecondary] = useState('');
  const [equipment, setEquipment] = useState('');
  const [type, setType] = useState('');
  const [instructions, setInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageDirty, setImageDirty] = useState(false);
  const [skillLevel, setSkillLevel] = useState<number | null>(null);
  const [effortLevel, setEffortLevel] = useState<number | null>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [benefits, setBenefits] = useState('');
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  // Prefill en modo edición
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const ex = await workoutRepository.getExerciseById(editId!);
        if (cancelled) return;
        if (!ex) {
          setToast({ message: 'Ejercicio no encontrado', status: 'error' });
          return;
        }
        setName(ex.name);
        setMuscle(ex.musclePrimary);
        setMuscleSecondary(ex.muscleSecondary ?? '');
        setEquipment(ex.equipment ?? '');
        setType(ex.type ?? '');
        setInstructions(ex.instructions ?? '');
        setVideoUrl(ex.videoUrl ?? '');
        setImageUri(ex.imagePath);
        setOriginalImage(ex.imagePath);
        setSkillLevel(ex.skillLevel ?? null);
        setEffortLevel(ex.effortLevel ?? null);
        setZones(ex.muscleZones ? ex.muscleZones.split(',').map(z => z.trim()).filter(Boolean) : []);
        setBenefits(ex.healthBenefits ?? '');
      } catch {
        if (!cancelled) setToast({ message: 'No se pudo cargar el ejercicio', status: 'error' });
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, editId]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageDirty(true);
    }
  };

  const removeImage = () => {
    Alert.alert('¿Quitar imagen?', 'La imagen se quitará del ejercicio.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => { setImageUri(null); setImageDirty(true); } },
    ]);
  };

  const toggleZone = (z: string) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

  const save = async () => {
    if (!name.trim() || !muscle) {
      setToast({ message: 'Nombre y músculo principal son obligatorios', status: 'error' });
      return;
    }
    try {
      let savedImagePath: string | null = originalImage;
      if (imageDirty && imageUri) {
        // Copiar imagen nueva al directorio persistente
        const dir = new Directory(Paths.document, 'exercise-images');
        if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
        const dest = new File(dir, `${Date.now()}.jpg`);
        new File(imageUri).copy(dest);
        savedImagePath = dest.uri;
      } else if (imageDirty && !imageUri) {
        savedImagePath = null;
      }

      const payload = {
        name: name.trim(),
        musclePrimary: muscle,
        muscleSecondary: muscleSecondary.trim() || null,
        equipment: equipment || null,
        type: (type || null) as 'compuesto' | 'aislamiento' | null,
        instructions: instructions.trim() || null,
        videoUrl: videoUrl.trim() || null,
        imagePath: savedImagePath,
        skillLevel: (skillLevel || null) as 1 | 2 | 3 | 4 | 5 | null,
        effortLevel: (effortLevel || null) as 1 | 2 | 3 | 4 | 5 | null,
        muscleZones: zones.length > 0 ? zones.join(',') : null,
        healthBenefits: benefits.trim() || null,
      };

      if (isEdit) {
        await workoutRepository.updateExercise(editId!, payload);
        hapticService.success();
        setToast({ message: '✓ Ejercicio actualizado', status: 'success' });
      } else {
        await workoutRepository.createCustomExercise(payload);
        hapticService.success();
        setToast({ message: '✓ Ejercicio creado', status: 'success' });
      }
      setTimeout(() => router.back(), 600);
    } catch {
      setToast({ message: isEdit ? 'No se pudo actualizar' : 'No se pudo crear el ejercicio', status: 'error' });
    }
  };

  if (loadingEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 20 }}>
        <Kicker>EDITAR EJERCICIO</Kicker>
        <Text style={[typeScale.bodySm, { color: theme.textMuted, marginTop: 12 }]}>Cargando…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.surface }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Kicker>{isEdit ? 'EDITAR EJERCICIO' : 'NUEVO EJERCICIO'}</Kicker>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} accessibilityLabel="Cerrar" />
      </View>
      <Text style={[typeScale.h1, { color: theme.text, marginBottom: 20 }]}>{isEdit ? name || 'Editar ejercicio' : 'Crear ejercicio'}</Text>

      {/* Nombre */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>NOMBRE *</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Sentadilla goblet" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 16, color: theme.text, marginBottom: 14 }} />

      {/* Músculo principal */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>MÚSCULO PRINCIPAL *</Text>
      <ChipRow options={MUSCLES} selected={muscle ? [muscle] : []} onToggle={m => setMuscle(m === muscle ? '' : m)} />

      {/* Músculos secundarios */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4, marginTop: 14 }]}>MÚSCULOS SECUNDARIOS</Text>
      <TextInput value={muscleSecondary} onChangeText={setMuscleSecondary} placeholder="glúteo, core (separados por coma)" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, marginBottom: 14 }} />

      {/* Tipo */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>TIPO</Text>
      <ChipRow options={TYPES} selected={type ? [type] : []} onToggle={t => setType(t === type ? '' : t)} />

      {/* Equipo */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, marginTop: 14 }]}>EQUIPO NECESARIO</Text>
      <ChipRow options={EQUIPMENT} selected={equipment ? [equipment] : []} onToggle={e => setEquipment(e === equipment ? '' : e)} />

      {/* Imagen */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6, marginTop: 14 }]}>IMAGEN</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <Button label={imageUri ? '📷 Cambiar imagen' : '📷 Añadir imagen'} variant="ghost" onPress={pickImage} style={{ flex: 1 }} />
        {imageUri && <Button label="🗑️" variant="ghost" onPress={removeImage} style={{ width: 48, paddingHorizontal: 0 }} accessibilityLabel="Quitar imagen" />}
      </View>
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160, borderRadius: radius.lg, marginBottom: 14 }} />}

      {/* Video URL */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>URL DE VIDEO (YouTube, etc.)</Text>
      <TextInput value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtube.com/watch?v=..." placeholderTextColor={theme.textMuted} autoCapitalize="none" style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, marginBottom: 14 }} />

      {/* Niveles */}
      <LevelPicker label="NIVEL DE HABILIDAD" value={skillLevel} onChange={v => setSkillLevel(v || null)} color={theme.primary} />
      <LevelPicker label="NIVEL DE ESFUERZO" value={effortLevel} onChange={v => setEffortLevel(v || null)} color={theme.secondary} />

      {/* Zonas musculares */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 6 }]}>ZONAS TRABAJADAS</Text>
      <ChipRow options={ZONES} selected={zones} onToggle={toggleZone} />

      {/* Instrucciones */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4, marginTop: 14 }]}>INSTRUCCIONES / TÉCNICA</Text>
      <TextInput value={instructions} onChangeText={setInstructions} multiline placeholder="Describe la técnica correcta..." placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 14, minHeight: 100, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, textAlignVertical: 'top', marginBottom: 14 }} />

      {/* Beneficios de salud */}
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>💚 BENEFICIOS PARA LA SALUD</Text>
      <TextInput value={benefits} onChangeText={setBenefits} multiline placeholder="Fortalece huesos y articulaciones&#10;Mejora la postura" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 14, minHeight: 80, fontFamily: 'NunitoSans_400Regular', fontSize: 14, color: theme.text, textAlignVertical: 'top', marginBottom: 20 }} />

      <Button label={isEdit ? '💾 Guardar cambios' : '💾 Crear ejercicio'} onPress={save} />
      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}
