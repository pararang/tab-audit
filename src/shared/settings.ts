/**
 * Minimal storage abstraction for settings persistence.
 * Default implementation uses chrome.storage.sync/local; can be swapped for testing.
 */
export interface SettingsStorage {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** Storage keys that go to chrome.storage.sync (small, scalar values) */
const SYNC_KEYS = new Set(['enabled', 'idleTimeout', 'maxTabs', 'notificationsEnabled', 'theme']);

/** Storage keys that go to chrome.storage.local (large lists that can exceed sync quota) */
const LOCAL_KEYS = new Set(['whitelist', 'blacklist', 'whitelistedTabGroups']);

const defaultSyncStorage: SettingsStorage = {
  get: (keys) => chrome.storage.sync.get(keys),
  set: (items) => chrome.storage.sync.set(items),
};

const defaultLocalStorage: SettingsStorage = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (items) => chrome.storage.local.set(items),
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
 * Reads from both sync and local storage backends.
 * @param syncStore - Sync storage backend (defaults to chrome.storage.sync)
 * @param localStore - Local storage backend (defaults to chrome.storage.local)
 * @returns Promise resolving to current settings
 */
export async function getSettings(
  syncStore?: SettingsStorage,
  localStore?: SettingsStorage,
): Promise<Settings> {
  const sync = syncStore ?? defaultSyncStorage;
  const local = localStore ?? defaultLocalStorage;

  try {
    const [syncResult, localResult] = await Promise.all([
      sync.get([...SYNC_KEYS]),
      local.get([...LOCAL_KEYS]),
    ]);
    return { ...DEFAULT_SETTINGS, ...syncResult, ...localResult };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves partial settings to storage.
 * Routes each key to the appropriate backend (sync for scalars, local for lists).
 * @param settings - Partial settings object to save
 * @param syncStore - Sync storage backend (defaults to chrome.storage.sync)
 * @param localStore - Local storage backend (defaults to chrome.storage.local)
 * @returns Promise resolving when complete
 * @throws Error if storage write fails
 */
export async function saveSettings(
  settings: Partial<Settings>,
  syncStore?: SettingsStorage,
  localStore?: SettingsStorage,
): Promise<void> {
  const sync = syncStore ?? defaultSyncStorage;
  const local = localStore ?? defaultLocalStorage;

  const syncItems: Record<string, unknown> = {};
  const localItems: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (LOCAL_KEYS.has(key)) {
      localItems[key] = value;
    } else {
      syncItems[key] = value;
    }
  }

  await Promise.all([
    Object.keys(syncItems).length > 0 ? sync.set(syncItems) : Promise.resolve(),
    Object.keys(localItems).length > 0 ? local.set(localItems) : Promise.resolve(),
  ]);
}
