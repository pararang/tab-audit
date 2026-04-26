export interface NotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title: string;
  message: string;
  priority?: number;
  isClickable?: boolean;
}

export interface NotificationsPort {
  create(options: NotificationOptions): Promise<void>;
}