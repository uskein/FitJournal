import { Redirect } from 'expo-router';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { useEffect, useState } from 'react';

/**
 * Guard de arranque — ARQUITECTURA_INFORMACION.md §5:
 * si settings['onboarding_done'] no existe → Onboarding; si no → tabs.
 * Mientras carga, null (el splash de _layout ya está visible).
 */
export default function Index() {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    settingsRepository
      .get('onboarding_done')
      .then((v) => setDone(v === '1'))
      .catch(() => setDone(true)); // B8: si la DB falla, no bloquear el arranque
  }, []);

  if (done === null) return null;
  return <Redirect href={done ? '/(tabs)' : '/onboarding'} />;
}
