import { settingsRepository } from '@/core/repositories/settingsRepository';

/**
 * backupReminderService — verifica cuándo fue el último export
 * y提醒 al usuario si ha pasado más de 30 días.
 */

export const backupReminderService = {
  async shouldRemind(): Promise<boolean> {
    const last = await settingsRepository.get('last_backup_date');
    if (!last) return true; // nunca exportó
    const lastDate = new Date(last);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 30;
  },

  async markBackup(): Promise<void> {
    await settingsRepository.set('last_backup_date', new Date().toISOString());
  },

  async daysSinceBackup(): Promise<number | null> {
    const last = await settingsRepository.get('last_backup_date');
    if (!last) return null;
    const lastDate = new Date(last);
    const now = new Date();
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  },
};
