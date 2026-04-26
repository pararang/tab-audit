import type { NotificationOptions, NotificationsPort } from '../../core/ports/notifications.port';

export class NoopNotificationsAdapter implements NotificationsPort {
  private notifications: NotificationOptions[] = [];

  async create(options: NotificationOptions): Promise<void> {
    this.notifications.push(options);
  }

  getNotifications(): NotificationOptions[] {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
  }
}