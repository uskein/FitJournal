import { AppError } from '@/core/errors';

/**
 * notificationService — HU-12 · borde B10
 * IMPORT LAZY de expo-notifications: el módulo nativo no existe en Expo Go
 * y crashea al importarse a nivel de módulo. Se carga dinámicamente bajo demanda.
 */

async function getNotifications() {
  return import('expo-notifications');
}

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    try {
      const Notifications = await getNotifications();
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleDaily(hour: number, minute: number): Promise<void> {
    try {
      const Notifications = await getNotifications();
      const granted = await this.requestPermission();
      if (!granted) throw new AppError('PERMISSION_DENIED', 'Permiso de notificaciones denegado');
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: '📓 DiarioFit', body: '¿Cómo amaneciste? Tu cuaderno te espera.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    } catch (e) {
      if (e instanceof AppError) throw e;
      // En Expo Go puede fallar por módulo nativo — no bloquear la app
      throw new AppError('PERMISSION_DENIED', 'Notificaciones no disponibles en Expo Go');
    }
  },

  async cancelAll(): Promise<void> {
    try {
      const Notifications = await getNotifications();
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch { /* silenciar en Expo Go */ }
  },
};
