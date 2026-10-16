import * as LocalAuthentication from 'expo-local-authentication';
import { AppError } from '@/core/errors';

/**
 * biometricService — HU-12 · M1 (almacenamiento)
 * Bloqueo biométrico del diario: Face ID / huella antes de ver datos.
 */

export const biometricService = {
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  async authenticate(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea tu FitJournal',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      throw new AppError('PERMISSION_DENIED', 'No se pudo autenticar');
    }
  },
};
