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
  /** Whether to show notifications when tabs are closed */
  notificationsEnabled: boolean;
  /** Whether the warning notification has been shown */
  warningShown: boolean;
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
  notificationsEnabled: true,
  warningShown: false,
  theme: 'system',
};

/**
 * Retrieves user settings from Chrome storage.
 * Merges stored settings with defaults for missing values.
 * @returns Promise resolving to current settings
 * @example
 * const settings = await getSettings();
 * if (settings.enabled) { ... }
 */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS, ...result };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves partial settings to Chrome storage.
 * Only updates specified fields, leaves others unchanged.
 * @param settings - Partial settings object to save
 * @returns Promise resolving when complete
 * @example
 * await saveSettings({ enabled: true, maxTabs: 100 });
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    await chrome.storage.local.set(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}
