import { getSettings, saveSettings } from '../shared/settings';

/**
 * Applies the theme to the document.
 * @param theme - 'light', 'dark', or 'system'
 */
export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  let resolvedTheme = theme;
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}

/**
 * Gets domain from URL.
 * @param url - The URL to extract domain from
 * @returns The domain name or empty string
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Gets statistics about current tabs.
 */
export async function getTabStats(): Promise<{ cleanedToday: number; topDomain: string }> {
  try {
    const tabs = await chrome.tabs.query({});

    // Count tabs per domain
    const domainCounts: Record<string, number> = {};
    tabs.forEach((tab) => {
      if (tab.url) {
        const domain = getDomain(tab.url);
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      }
    });

    // Find top domain
    let topDomain = '-';
    let maxCount = 0;
    for (const [domain, count] of Object.entries(domainCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topDomain = domain;
      }
    }

    // Get cleaned count from storage (would be tracked by background script)
    const stats = (await chrome.storage.local.get('tabsCleanedToday')) as {
      tabsCleanedToday?: number;
    };
    const cleanedToday = stats.tabsCleanedToday || 0;

    return { cleanedToday, topDomain };
  } catch {
    return { cleanedToday: 0, topDomain: '-' };
  }
}

/**
 * Interface for popup DOM elements
 */
export interface PopupElements {
  tabCount: HTMLElement;
  cleanedCount: HTMLElement;
  topDomain: HTMLElement;
  toggleButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement | null;
}

/**
 * Gets popup DOM elements.
 * @returns Object containing all popup elements
 */
export function getPopupElements(): PopupElements | null {
  const tabCount = document.getElementById('tab-count') as HTMLElement;
  const cleanedCount = document.getElementById('cleaned-count') as HTMLElement;
  const topDomain = document.getElementById('top-domain') as HTMLElement;
  const toggleButton = document.getElementById('toggle-clean') as HTMLButtonElement;
  const settingsButton = document.getElementById('open-settings') as HTMLButtonElement | null;

  if (!tabCount || !cleanedCount || !topDomain || !toggleButton) {
    return null;
  }

  return {
    tabCount,
    cleanedCount,
    topDomain,
    toggleButton,
    settingsButton,
  };
}

/**
 * Updates the tab count display.
 * @param elements - Popup elements
 */
export function updateTabCount(elements: PopupElements): void {
  chrome.tabs.query({}, (tabs) => {
    elements.tabCount.textContent = tabs.length.toString();
  });
}

/**
 * Updates the statistics display.
 * @param elements - Popup elements
 */
export async function updateStats(elements: PopupElements): Promise<void> {
  try {
    const stats = await getTabStats();
    elements.cleanedCount.textContent =
      stats.cleanedToday > 0 ? stats.cleanedToday.toString() : '-';
    elements.topDomain.textContent = stats.topDomain;
  } catch {
    elements.cleanedCount.textContent = '-';
    elements.topDomain.textContent = '-';
  }
}

/**
 * Updates the toggle button text and class based on enabled state.
 * @param elements - Popup elements
 * @param enabled - Whether auto-clean is enabled
 */
export function updateButton(elements: PopupElements, enabled: boolean): void {
  elements.toggleButton.textContent = enabled ? 'Disable Auto Clean' : 'Enable Auto Clean';
  elements.toggleButton.className = enabled ? 'enabled' : 'disabled';
}

/**
 * Handles toggle button click.
 * @param elements - Popup elements
 */
export async function handleToggle(elements: PopupElements): Promise<void> {
  const currentSettings = await getSettings();
  const newEnabled = !currentSettings.enabled;
  await saveSettings({ enabled: newEnabled });
  updateButton(elements, newEnabled);

  if (newEnabled) {
    chrome.runtime.sendMessage({ action: 'runCleanup' });
  }
}

/**
 * Initializes the popup.
 * Gets elements, loads settings, and binds event listeners.
 */
export async function initPopup(): Promise<void> {
  const elements = getPopupElements();
  if (!elements) {
    console.error('Popup elements not found');
    return;
  }

  // Load initial state
  const settings = await getSettings();
  updateButton(elements, settings.enabled);
  applyTheme(settings.theme);

  // Update tab count and stats on load
  updateTabCount(elements);
  await updateStats(elements);

  // Toggle button click
  elements.toggleButton.addEventListener('click', async () => {
    await handleToggle(elements);
  });

  // Settings button click
  elements.settingsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
});
