import { AppError } from '@/core/errors';

/**
 * audioService — stub temporal para Expo Go SDK 57.
 * expo-audio requiere development build (no funciona en Expo Go).
 * La funcionalidad de voz se restaurará cuando se haga el EAS build.
 */

export const audioService = {
  async startRecording(): Promise<void> {
    throw new AppError('PERMISSION_DENIED', 'Notas de voz disponibles solo en build de producción');
  },

  async stopAndSave(): Promise<{ id: number; durationS: number }> {
    throw new AppError('CONFLICT', 'No hay grabación en curso');
  },

  async cancelRecording(): Promise<void> {},

  async listAudios(): Promise<Array<{ id: number; filePath: string; durationS: number | null }>> {
    return [];
  },

  async play(): Promise<void> {
    throw new AppError('NOT_FOUND', 'Reproducción disponible solo en build de producción');
  },

  async deleteAudio(): Promise<void> {},
};
