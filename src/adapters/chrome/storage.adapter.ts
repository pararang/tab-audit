import type { Settings } from '../../shared/settings';
import type { StoragePort } from '../../core/ports/storage.port';

export class ChromeStorageAdapter implements StoragePort {
  async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.local.get((result) => resolve(result as unknown as Settings));
    });
  }

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(settings, resolve);
    });
  }

  onChanged(callback: (changes: Record<string, unknown>, namespace: string) => void): void {
    chrome.storage.onChanged.addListener(callback);
  }
}