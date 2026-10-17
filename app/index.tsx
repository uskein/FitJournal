import { Redirect } from 'expo-router';
import { settingsRepository } from '@/core/repositories/settingsRepository';
import { useEffect, useState } from 'react';

export default function Index() {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    settingsRepository
      .get('onboarding_done')
      .then((v) => setDone(v === '1'))
      .catch(() => setDone(true));
  }, []);

  if (done === null) return null;
  return <Redirect href={done ? '/(tabs)/hoy' : '/onboarding'} />;
}
