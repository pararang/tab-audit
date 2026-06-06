import { getSettings, saveSettings, DEFAULT_SETTINGS, Settings } from '../shared/settings';
import { applyTheme } from '../shared/theme';

/**
 * Validates imported settings.
 * @param data - The parsed JSON data
 * @returns True if valid settings object
 */
export function isValidSettings(data: unknown): data is Partial<Settings> {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const settings = data as Record<string, unknown>;
  return (
    (settings.enabled === undefined || typeof settings.enabled === 'boolean') &&
    (settings.idleTimeout === undefined || typeof settings.idleTimeout === 'number') &&
    (settings.maxTabs === undefined || typeof settings.maxTabs === 'number') &&
    (settings.theme === undefined ||
      settings.theme === 'light' ||
      settings.theme === 'dark' ||
      settings.theme === 'system') &&
    (settings.whitelist === undefined || Array.isArray(settings.whitelist)) &&
    (settings.blacklist === undefined || Array.isArray(settings.blacklist)) &&
    (settings.whitelistedTabGroups === undefined ||
      Array.isArray(settings.whitelistedTabGroups)) &&
    (settings.notificationsEnabled === undefined ||
      typeof settings.notificationsEnabled === 'boolean')
  );
}

/**
 * Interface for form elements container
 */
export interface OptionsFormElements {
  form: HTMLFormElement;
  idleTimeout: HTMLInputElement;
  maxTabs: HTMLInputElement;
  theme: HTMLSelectElement;
  whitelist: HTMLTextAreaElement;
  blacklist: HTMLTextAreaElement;
  whitelistedTabGroups: HTMLTextAreaElement;
  notificationsEnabled: HTMLInputElement;
  backupBtn: HTMLButtonElement;
  restoreBtn: HTMLButtonElement;
  restoreFile: HTMLInputElement;
}

/**
 * Gets form elements from the DOM.
 * @returns Object containing all form elements
 */
export function getFormElements(): OptionsFormElements | null {
  const form = document.getElementById('options-form') as HTMLFormElement;
  const idleTimeout = document.getElementById('idle-timeout') as HTMLInputElement;
  const maxTabs = document.getElementById('max-tabs') as HTMLInputElement;
  const theme = document.getElementById('theme') as HTMLSelectElement;
  const whitelist = document.getElementById('whitelist') as HTMLTextAreaElement;
  const blacklist = document.getElementById('blacklist') as HTMLTextAreaElement;
  const whitelistedTabGroups = document.getElementById('whitelisted-tab-groups') as HTMLTextAreaElement;
  const notificationsEnabled = document.getElementById('notifications-enabled') as HTMLInputElement;
  const backupBtn = document.getElementById('backup-btn') as HTMLButtonElement;
  const restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement;
  const restoreFile = document.getElementById('restore-file') as HTMLInputElement;

  if (
    !form ||
    !idleTimeout ||
    !maxTabs ||
    !theme ||
    !whitelist ||
    !blacklist ||
    !whitelistedTabGroups ||
    !notificationsEnabled ||
    !backupBtn ||
    !restoreBtn ||
    !restoreFile
  ) {
    return null;
  }

  return {
    form,
    idleTimeout,
    maxTabs,
    theme,
    whitelist,
    blacklist,
    whitelistedTabGroups,
    notificationsEnabled,
    backupBtn,
    restoreBtn,
    restoreFile,
  };
}

/**
 * Loads settings from storage into form elements.
 * @param elements - Form elements to populate
 */
export async function loadSettingsToForm(elements: OptionsFormElements): Promise<void> {
  const settings = await getSettings();
  elements.idleTimeout.value = settings.idleTimeout.toString();
  elements.maxTabs.value = settings.maxTabs.toString();
  elements.theme.value = settings.theme;
  elements.whitelist.value = settings.whitelist.join('\n');
  elements.blacklist.value = settings.blacklist.join('\n');
  elements.whitelistedTabGroups.value = settings.whitelistedTabGroups.join('\n');
  elements.notificationsEnabled.checked = settings.notificationsEnabled;
  applyTheme(settings.theme);
}

/**
 * Saves settings from form to storage.
 * @param elements - Form elements to read from
 * @returns Saved settings object
 */
export async function saveSettingsFromForm(elements: OptionsFormElements): Promise<Settings> {
  // Preserve current enabled state (options form has no enabled toggle)
  const currentSettings = await getSettings();

  // Validate maxTabs: must be a positive integer, fall back to default if invalid
  const parsedMaxTabs = parseInt(elements.maxTabs.value);
  const maxTabs = Number.isInteger(parsedMaxTabs) && parsedMaxTabs >= 0 ? parsedMaxTabs : DEFAULT_SETTINGS.maxTabs;

  // Validate idleTimeout: must be a non-negative integer, fall back to default if invalid
  const parsedIdleTimeout = parseInt(elements.idleTimeout.value);
  const idleTimeout = Number.isInteger(parsedIdleTimeout) && parsedIdleTimeout >= 0 ? parsedIdleTimeout : DEFAULT_SETTINGS.idleTimeout;

  const newSettings: Settings = {
    enabled: currentSettings.enabled,
    idleTimeout,
    maxTabs,
    theme: elements.theme.value as 'light' | 'dark' | 'system',
    whitelist: elements.whitelist.value
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d),
    blacklist: elements.blacklist.value
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d),
    whitelistedTabGroups: elements.whitelistedTabGroups.value
      .split('\n')
      .map((d) => d.trim())
      .filter((d) => d),
    notificationsEnabled: elements.notificationsEnabled.checked,
    warningShown: false,
  };
  await saveSettings(newSettings);
  applyTheme(newSettings.theme);
  return newSettings;
}

/**
 * Binds all event listeners for the options page.
 * @param elements - Form elements to bind events to
 */
export function bindEventListeners(elements: OptionsFormElements): void {
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    getSettings().then((settings) => {
      if (settings.theme === 'system') {
        applyTheme('system');
      }
    });
  });

  // Backup (export) settings
  elements.backupBtn.addEventListener('click', async () => {
    try {
      const settings = await getSettings();
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tabclean-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting settings:', error);
      alert('Error exporting settings');
    }
  });

  // Restore (import) settings
  elements.restoreBtn.addEventListener('click', () => {
    elements.restoreFile.click();
  });

  elements.restoreFile.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!isValidSettings(data)) {
        alert('Invalid settings file format');
        return;
      }

      // Apply defaults for missing fields
      const fullSettings: Settings = {
        ...DEFAULT_SETTINGS,
        ...data,
        whitelist: data.whitelist || [],
        blacklist: data.blacklist || [],
        whitelistedTabGroups: data.whitelistedTabGroups || [],
      };

      await saveSettings(fullSettings);

      // Update form with restored settings
      elements.idleTimeout.value = fullSettings.idleTimeout.toString();
      elements.maxTabs.value = fullSettings.maxTabs.toString();
      elements.theme.value = fullSettings.theme;
      elements.whitelist.value = fullSettings.whitelist.join('\n');
      elements.blacklist.value = fullSettings.blacklist.join('\n');
      elements.whitelistedTabGroups.value = fullSettings.whitelistedTabGroups.join('\n');
      elements.notificationsEnabled.checked = fullSettings.notificationsEnabled;
      applyTheme(fullSettings.theme);

      alert('Settings restored successfully!');
    } catch (error) {
      console.error('Error importing settings:', error);
      alert('Error importing settings. Make sure the file is valid JSON.');
    }

    // Reset file input
    elements.restoreFile.value = '';
  });

  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await saveSettingsFromForm(elements);
      alert('Settings saved');
    } catch (error) {
      console.error('Error saving settings in options:', error);
      alert('Error saving settings');
    }
  });
}

/**
 * Initializes the options page.
 * Gets form elements, loads settings, and binds event listeners.
 */
export async function initOptions(): Promise<void> {
  const elements = getFormElements();
  if (!elements) {
    console.error('Form elements not found');
    return;
  }

  await loadSettingsToForm(elements);
  bindEventListeners(elements);
}

// Options script
document.addEventListener('DOMContentLoaded', async () => {
  await initOptions();
});
