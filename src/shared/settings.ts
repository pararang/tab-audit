/**
 * Minimal storage abstraction for settings persistence.
 * Default implementation uses chrome.storage.sync; can be swapped for testing.
 */
export interface SettingsStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const defaultStorage: SettingsStorage = {
  get: (keys) => chrome.storage.sync.get(keys),
  set: (items) => chrome.storage.sync.set(items),
};

/**
 * User settings for the tab auto-clean extension.
 */
export interface Settings {
  /** Whether the auto-clean feature is enabled */
  enabled: boolean;
  /** Idle timeout in minutes before closing tabs */
  idleTimeout: number;
  /** Maximum number of tabs before cleanup */
  maxTabs: number;
  /** Whitelist of domain patterns to never close */
  whitelist: string[];
  /** Blacklist of domain patterns to always close */
  blacklist: string[];
  /** Whitelist of tab group names to never close */
  whitelistedTabGroups: string[];
  /** Whether to show notifications when tabs are closed */
  notificationsEnabled: boolean;
  /** Theme preference: 'light', 'dark', or 'system' */
  theme: 'light' | 'dark' | 'system';
}

/** Default settings applied on first install */
export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  idleTimeout: 30,
  maxTabs: 50,
  whitelist: [],
  blacklist: [],
  whitelistedTabGroups: [],
  notificationsEnabled: true,
  theme: 'system',
};

/**
 * Retrieves user settings from storage.
 * Merges stored settings with defaults for missing values.
 * @param storage - Storage backend (defaults to chrome.storage.sync)
 * @returns Promise resolving to current settings
 */
export async function getSettings(storage?: SettingsStorage): Promise<Settings> {
  const store = storage ?? defaultStorage;
  try {
    const result = await store.get(Object.keys(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS, ...result };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves partial settings to storage.
 * Only updates specified fields, leaves others unchanged.
 * @param settings - Partial settings object to save
 * @param storage - Storage backend (defaults to chrome.storage.sync)
 * @returns Promise resolving when complete
 */
export async function saveSettings(
  settings: Partial<Settings>,
  storage?: SettingsStorage,
): Promise<void> {
  const store = storage ?? defaultStorage;
  try {
    await store.set(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}
