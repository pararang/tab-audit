import type { Settings } from '../../shared/settings';
import type { StoragePort } from '../../core/ports/storage.port';

export class InMemoryStorageAdapter implements StoragePort {
  private settings: Settings;
  private listeners: Array<(changes: Record<string, unknown>, namespace: string) => void> = [];

  constructor(defaultSettings: Settings) {
    this.settings = { ...defaultSettings };
  }

  async getSettings(): Promise<Settings> {
    return { ...this.settings };
  }

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.listeners.forEach((listener) => {
      listener(settings as Record<string, unknown>, 'local');
    });
  }

  onChanged(callback: (changes: Record<string, unknown>, namespace: string) => void): void {
    this.listeners.push(callback);
  }
}