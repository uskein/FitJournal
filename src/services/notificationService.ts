import * as Notifications from 'expo-notifications';
import { AppError } from '@/core/errors';

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleDaily(hour: number, minute: number): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) throw new AppError('PERMISSION_DENIED', 'Permiso de notificaciones denegado');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title: '📓 FitJournal', body: '¿Cómo amaneciste? Tu cuaderno te espera.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
