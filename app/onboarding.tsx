import React, { useEffect, useState } from 'react';
import { Text, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Button, Card, Kicker, Badge } from '@/ui';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { palette, radius } from '@/theme/tokens';

/**
 * Onboarding — ARQUITECTURA_INFORMACION.md §1 · 4 pasos guiados:
 * 1) Bienvenida · 2) Perfil · 3) Tema · 4) Recordatorio.
 * Persiste el paso (settings['onboarding_step']) por si cierran la app a mitad.
 */

const STEPS = [
  {
    kicker: 'BIENVENIDA',
    icon: '📓',
    title: 'Bienvenido a DiarioFit',
    message:
      'Tu bitácora de vida y gimnasio, unificada en un solo lugar. Escribe, entrena, conócete mejor.',
    highlight: '🔒 Tus datos nunca salen de tu dispositivo. Sin cuentas, sin nube, sin anuncios.',
  },
  {
    kicker: 'TU PERFIL',
    icon: '👤',
    title: 'Cuéntanos de ti',
    message: 'Tu nombre, peso actual y meta principal. Esto personaliza tu experiencia.',
  },
  {
    kicker: 'APARIENCIA',
    icon: '🎨',
    title: 'Elige tu atmósfera',
    message: 'El tema claro es cálido como papel; el oscuro es noche verde, íntima y suave.',
  },
  {
    kicker: 'RITUAL',
    icon: '🔔',
    title: 'Un recordatorio amable',
    message: 'Puedes recibir un recordatorio diario para no olvidar tu momento contigo.',
  },
] as const;

/** Tips contextuales por paso — reducen fricción y abandonos */
const HINTS = [
  '💡 Todo se guarda solo en tu teléfono. Puedes exportar un respaldo cuando quieras desde Ajustes.',
  '💡 Esto lo puedes cambiar después en Perfil → Tu perfil.',
  '💡 Se aplica al instante y también lo puedes cambiar en Ajustes.',
  '💡 Se envía 1 notificación local al día; nunca mensajes ni anuncios. Puedes desactivarlo cuando quieras.',
] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');
  const [reminder, setReminder] = useState(true);
  const [userName, setUserName] = useState('');
  const [userWeight, setUserWeight] = useState('');
  const [userGoal, setUserGoal] = useState('');

  // Restaurar progreso previo (si cerraron la app a mitad del onboarding)
  useEffect(() => {
    (async () => {
      try {
        const saved = await settingsRepository.get('onboarding_step');
        if (saved) {
          const n = Number(saved);
          if (n >= 0 && n < STEPS.length) setStep(n);
        }
      } catch { /* arrancar en 0 */ }
    })();
  }, []);

  const goStep = async (n: number) => {
    setStep(n);
    try { await settingsRepository.set('onboarding_step', String(n)); } catch { /* best-effort */ }
  };

  const finish = async () => {
    await settingsRepository.set('theme', mode);
    await settingsRepository.set('reminder_enabled', reminder ? '1' : '0');
    await settingsRepository.set('user_name', userName);
    await settingsRepository.set('user_weight', userWeight);
    await settingsRepository.set('user_goal', userGoal);
    await settingsRepository.set('onboarding_step', '0');
    await settingsRepository.set('onboarding_done', '1');
    router.replace('/(tabs)/hoy');
  };

  const s = STEPS[step]!;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
      <Kicker>{`${s.kicker} · PASO ${step + 1}/${STEPS.length}`}</Kicker>
      <Text style={{ fontSize: 64, marginTop: 20 }}>{s.icon}</Text>
      <Text style={[typeScale.display, { color: theme.text, marginTop: 16 }]}>{s.title}</Text>
      <Text style={[typeScale.body, { color: theme.textMuted, marginTop: 12, marginBottom: 24 }]}>{s.message}</Text>

      {step === 0 && (
        <Card>
          <Text style={[typeScale.bodySm, { color: theme.text }]}>
            DiarioFit funciona <Text style={{ fontWeight: '700' }}>100% sin internet</Text>. Tus diarios,
            fotos y entrenamientos se guardan en tu teléfono. Tú decides si exportar un respaldo.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Badge variant="habit">SQLite local</Badge>
            <Badge variant="habit">Sin cuenta</Badge>
            <Badge variant="habit">Exportable</Badge>
          </View>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>NOMBRE</Text>
          <TextInput value={userName} onChangeText={setUserName} placeholder="Tu nombre" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 16, color: theme.text, marginBottom: 14 }} />
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>PESO ACTUAL (kg)</Text>
          <TextInput value={userWeight} onChangeText={setUserWeight} keyboardType="decimal-pad" placeholder="70.5" placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: theme.text, marginBottom: 14 }} />
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>META / OBJETIVO</Text>
          <TextInput value={userGoal} onChangeText={setUserGoal} placeholder="Ganar músculo, bajar grasa..." placeholderTextColor={theme.textMuted} style={{ backgroundColor: theme.field, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontFamily: 'NunitoSans_400Regular', fontSize: 16, color: theme.text }} />
        </Card>
      )}

      {step === 2 && (
        <View style={{ gap: 12 }}>
          {(['light', 'dark', 'system'] as const).map((m) => (
            <Button
              key={m}
              label={m === 'light' ? '☀️ Claro (crema)' : m === 'dark' ? '🌙 Oscuro (noche verde)' : '📱 Seguir el sistema'}
              variant={mode === m ? 'primary' : 'ghost'}
              onPress={() => setMode(m)}
            />
          ))}
        </View>
      )}

      {step === 3 && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typeScale.body, { color: theme.text, flex: 1 }]}>Recordatorio diario (21:00)</Text>
            <Button label={reminder ? 'Activado' : 'Desactivado'} variant={reminder ? 'primary' : 'ghost'} onPress={() => setReminder(!reminder)} style={{ width: 130 }} />
          </View>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 12 }]}>
            «¿Cómo amaneciste?» — una notificación local, sin conexión.
          </Text>
        </Card>
      )}

      <View style={{ flex: 1 }} />

      {/* Hint contextual */}
      <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 12, marginBottom: 14 }}>
        <Text style={[typeScale.caption, { color: theme.textMuted, lineHeight: 18 }]}>{HINTS[step]}</Text>
      </View>

      <Button
        label={step === 3 ? '✧ Empezar' : 'Continuar'}
        onPress={() => (step === 3 ? finish() : goStep(step + 1))}
      />
      {step > 0 && (
        <Button label="Atrás" variant="ghost" onPress={() => goStep(step - 1)} style={{ marginTop: 10 }} />
      )}
      <View style={{ height: 8, backgroundColor: palette.border, borderRadius: 999, marginTop: 20, overflow: 'hidden' }}>
        <View style={{ width: `${((step + 1) / STEPS.length) * 100}%`, height: '100%', backgroundColor: palette.primary }} />
      </View>
    </View>
  );
}
