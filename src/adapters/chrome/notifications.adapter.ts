import type { NotificationOptions, NotificationsPort } from '../../core/ports/notifications.port';

export class ChromeNotificationsAdapter implements NotificationsPort {
  async create(options: NotificationOptions): Promise<void> {
    return chrome.notifications.create(options as unknown as chrome.notifications.NotificationOptions);
  }
}