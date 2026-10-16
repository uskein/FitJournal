import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Button, Card, Kicker, Badge } from '@/ui';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { palette } from '@/theme/tokens';

/**
 * Onboarding — ARQUITECTURA_INFORMACION.md §1 · 3 pasos guiados:
 * 1) Bienvenida + promesa de privacidad · 2) Tema · 3) Recordatorio.
 * Al terminar: settings['onboarding_done']='1' → redirect a tabs.
 */

const STEPS = [
  {
    kicker: 'BIENVENIDA',
    icon: '📓',
    title: 'Bienvenido a FitJournal',
    message:
      'Tu bitácora de vida y gimnasio, unificada en un solo lugar. Escribe, entrena, conócete mejor.',
    highlight: '🔒 Tus datos nunca salen de tu dispositivo. Sin cuentas, sin nube, sin anuncios.',
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
    message: 'Puedes recibir un recordatorio diario para no olvidar tu momento contigo. Siempre local, sin internet.',
  },
] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('system');
  const [reminder, setReminder] = useState(true);

  const finish = async () => {
    await settingsRepository.set('theme', mode);
    await settingsRepository.set('reminder_enabled', reminder ? '1' : '0');
    await settingsRepository.set('onboarding_done', '1');
    router.replace('/(tabs)');
  };

  const s = STEPS[step]!;

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, paddingTop: insets.top + 40, paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}>
      <Kicker>{`${s.kicker} · PASO ${step + 1}/3`}</Kicker>
      <Text style={{ fontSize: 64, marginTop: 20 }}>{s.icon}</Text>
      <Text style={[typeScale.display, { color: theme.text, marginTop: 16 }]}>{s.title}</Text>
      <Text style={[typeScale.body, { color: theme.textMuted, marginTop: 12, marginBottom: 24 }]}>{s.message}</Text>

      {step === 0 && (
        <Card>
          <Text style={[typeScale.bodySm, { color: theme.text }]}>
            FitJournal funciona <Text style={{ fontWeight: '700' }}>100% sin internet</Text>. Tus diarios,
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

      {step === 2 && (
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

      <Button
        label={step === 2 ? '✧ Empezar' : 'Continuar'}
        onPress={() => (step === 2 ? finish() : setStep(step + 1))}
      />
      {step > 0 && (
        <Button label="Atrás" variant="ghost" onPress={() => setStep(step - 1)} style={{ marginTop: 10 }} />
      )}
      <View style={{ height: 8, backgroundColor: palette.border, borderRadius: 999, marginTop: 20, overflow: 'hidden' }}>
        <View style={{ width: `${((step + 1) / 3) * 100}%`, height: '100%', backgroundColor: palette.primary }} />
      </View>
    </View>
  );
}
