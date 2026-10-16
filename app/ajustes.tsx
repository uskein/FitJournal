import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeMode, useThemeProvider } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { Badge, Button, Card, EmptyState, Kicker, Sheet, Toast } from '@/ui';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { exportService } from '@/services/exportService';
import { importService } from '@/services/importService';
import { biometricService } from '@/services/biometricService';
import { notificationService } from '@/services/notificationService';
import { getDatabase } from '@/core/db/database';

/**
 * Ajustes — ARQUITECTURA_INFORMACION §1 (sheet) · BLUEPRINTS §8
 * Tema · Biométrico · Recordatorio · Export/Import · Borrar datos.
 */

export default function AjustesScreen() {
  const theme = useTheme();
  const mode = useThemeMode();
  const { setMode } = useThemeProvider();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [biometricOn, setBiometricOn] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [bio, rem, hasBio] = await Promise.all([
      settingsRepository.get('biometric_lock'),
      settingsRepository.get('reminder_enabled'),
      biometricService.isAvailable(),
    ]);
    setBiometricOn(bio === '1');
    setReminderOn(rem === '1');
    setCanBiometric(hasBio);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBiometric = async () => {
    const next = !biometricOn;
    setBiometricOn(next);
    await settingsRepository.set('biometric_lock', next ? '1' : '0');
  };

  const toggleReminder = async () => {
    try {
      if (!reminderOn) {
        await notificationService.scheduleDaily(21, 0);
        setReminderOn(true);
        await settingsRepository.set('reminder_enabled', '1');
        setToast({ message: '🔔 Recordatorio activado (21:00)', status: 'success' });
      } else {
        await notificationService.cancelAll();
        setReminderOn(false);
        await settingsRepository.set('reminder_enabled', '0');
        setToast({ message: 'Recordatorio desactivado', status: 'success' });
      }
    } catch {
      setToast({ message: 'Permiso de notificaciones denegado', status: 'error' });
    }
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const uri = await exportService.exportBackup();
      setToast({ message: `📤 Respaldo listo: ${uri.split('/').pop()}`, status: 'success' });
    } catch {
      setToast({ message: 'No se pudo generar el respaldo', status: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const doWipe = () => {
    Alert.alert(
      '¿Borrar todos los datos?',
      'Se eliminarán TU DIARIO, ENTRENAMIENTOS, FOTOS y AJUSTES de este dispositivo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.execAsync('PRAGMA foreign_keys = OFF');
            const tables = [
              'diary_entries','tags','diary_entry_tags','mood_entries','gratitude_items',
              'wellness_metrics','word_of_day','day_colors','audio_notes','sketches',
              'habits','habit_logs','goals','goal_logs','exercises','routines',
              'routine_exercises','workout_sessions','session_exercises','session_sets','photos','settings',
            ];
            for (const t of tables) await db.execAsync(`DELETE FROM ${t}`);
            await db.execAsync('PRAGMA foreign_keys = ON');
            setToast({ message: '🗑️ Datos borrados', status: 'success' });
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 40,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View>
          <Kicker>CONFIGURACIÓN</Kicker>
          <Text style={[typeScale.h1, { color: theme.text, marginTop: 4 }]}>Ajustes</Text>
        </View>
        <Button label="✕" variant="ghost" onPress={() => router.back()} style={{ width: 48, paddingHorizontal: 0 }} />
      </View>

      {/* Privacidad */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>PRIVACIDAD</Kicker>
        {canBiometric ? (
          <ToggleRow
            label="🔒 Bloqueo biométrico"
            value={biometricOn}
            onToggle={toggleBiometric}
          />
        ) : (
          <Text style={[typeScale.bodySm, { color: theme.textMuted, marginBottom: 8 }]}>
            🔒 Bloqueo biométrico — no disponible en este dispositivo
          </Text>
        )}
        <ToggleRow
          label="🔔 Recordatorio diario (21:00)"
          value={reminderOn}
          onToggle={toggleReminder}
        />
      </Card>

      {/* Tema */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>APARIENCIA</Kicker>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['light', 'dark', 'system'] as const).map((m) => (
            <Button
              key={m}
              label={m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '📱'}
              variant={mode === m ? 'primary' : 'ghost'}
              onPress={() => {
                settingsRepository.set('theme', m);
                setMode(m);
              }}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </Card>

      {/* Datos */}
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>TUS DATOS</Kicker>
        <Button
          label={exporting ? '⏳ Generando…' : '📤 Exportar respaldo (JSON + ZIP)'}
          onPress={doExport}
          disabled={exporting}
          style={{ marginBottom: 10 }}
        />
        <Button
          label="🗑️ Borrar todos los datos"
          variant="ghost"
          onPress={doWipe}
          style={{ marginBottom: 10 }}
        />
        <Text style={[typeScale.caption, { color: theme.textMuted }]}>
          Tus datos nunca salen de tu dispositivo. El respaldo se guarda localmente.
        </Text>
      </Card>

      {/* Acerca de */}
      <Card>
        <Kicker style={{ marginBottom: 8 }}>ACERCA DE</Kicker>
        <Text style={[typeScale.bodySm, { color: theme.text }]}>FitJournal v1.0.0</Text>
        <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 4 }]}>
          Bitácora de vida y gimnasio · 100% local · Sin cuentas ni nube
        </Text>
      </Card>

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </ScrollView>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <Text style={[typeScale.bodySm, { color: theme.text, flex: 1 }]}>{label}</Text>
      <Button
        label={value ? 'Activado' : 'Desactivado'}
        variant={value ? 'primary' : 'ghost'}
        onPress={onToggle}
        style={{ width: 120, height: 42 }}
      />
    </View>
  );
}
