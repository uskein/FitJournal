import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { BigData, Button } from '@/ui';
import { hapticService } from '@/services/hapticService';

/**
 * RestTimer — BLUEPRINTS §4 (descanso entre series)
 * Cuenta regresiva con BigData mono. Al terminar, resetea + haptic.
 * Mantiene la pantalla encendida mientras corre (expo-keep-awake).
 */

interface RestTimerProps {
  seconds: number;
  onFinish?: () => void;
}

const KEEP_AWAKE_TAG = 'diariofit-rest-timer';

export function RestTimer({ seconds, onFinish }: RestTimerProps) {
  const theme = useTheme();
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setRunning(false);
  }, [seconds]);

  // Keep-awake: solo mientras el timer corre (ahorra batería)
  useEffect(() => {
    if (running) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => { /* sin soporte */ });
    } else {
      try { deactivateKeepAwake(KEEP_AWAKE_TAG); } catch { /* sin soporte */ }
    }
    return () => {
      try { deactivateKeepAwake(KEEP_AWAKE_TAG); } catch { /* sin soporte */ }
    };
  }, [running]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            hapticService.success();
            onFinish?.();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining, onFinish]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <View
      style={{
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.field,
        marginBottom: 14,
      }}
    >
      <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 4 }]}>DESCANSO</Text>
      <BigData size="lg" color={theme.primary}>{`${mm}:${ss}`}</BigData>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Button
          label={running ? '⏸ Pausar' : '▶ Empezar'}
          variant={running ? 'ghost' : 'primary'}
          onPress={() => setRunning(!running)}
          style={{ height: 40, paddingHorizontal: 16 }}
          accessibilityLabel={running ? 'Pausar descanso' : 'Empezar descanso'}
        />
        <Button
          label="⏭ Saltar"
          variant="ghost"
          onPress={() => {
            setRunning(false);
            setRemaining(0);
            onFinish?.();
          }}
          style={{ height: 40, paddingHorizontal: 16 }}
          accessibilityLabel="Saltar descanso"
        />
      </View>
      {running && (
        <Text style={[typeScale.caption, { color: theme.textMuted, marginTop: 8 }]}>🔒 Pantalla encendida durante el descanso</Text>
      )}
    </View>
  );
}
