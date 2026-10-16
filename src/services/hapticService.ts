import { Platform, Vibration } from 'react-native';

/**
 * hapticService — feedback háptico para la app.
 * En Expo Go iOS no funciona nativamente; en Android sí.
 * En dev build nativo funciona en ambas plataformas.
 */

export const hapticService = {
  /** Vibración ligera al completar serie, marcar hábito, etc. */
  light(): void {
    if (Platform.OS !== 'web') Vibration.vibrate(10);
  },

  /** Vibración media al detectar PR o logro importante */
  medium(): void {
    if (Platform.OS !== 'web') Vibration.vibrate(30);
  },

  /** Vibración de éxito (doble pulso) */
  success(): void {
    if (Platform.OS !== 'web') Vibration.vibrate([0, 15, 40, 15]);
  },

  /** Vibración de error */
  error(): void {
    if (Platform.OS !== 'web') Vibration.vibrate([0, 30, 60, 30]);
  },

  /** Celebración de PR (triple pulso) */
  pr(): void {
    if (Platform.OS !== 'web') Vibration.vibrate([0, 20, 50, 20, 50, 20]);
  },
};
