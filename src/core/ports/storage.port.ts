import type { Settings } from '../../shared/settings';

export interface StoragePort {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Partial<Settings>): Promise<void>;
  onChanged(callback: (changes: Record<string, unknown>, namespace: string) => void): void;
}