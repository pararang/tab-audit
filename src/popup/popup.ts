import { getSettings, saveSettings } from '../shared/settings';
import { getDomain } from '../shared/domain';
import { applyTheme } from '../shared/theme';
import QRCode from 'qrcode';

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
  qrCanvas: HTMLCanvasElement;
  qrUrl: HTMLElement;
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
  const qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  const qrUrl = document.getElementById('qr-url') as HTMLElement;

  if (!tabCount || !cleanedCount || !topDomain || !toggleButton) {
    return null;
  }

  return {
    tabCount,
    cleanedCount,
    topDomain,
    toggleButton,
    settingsButton,
    qrCanvas,
    qrUrl,
  };
}

/**
 * Updates the tab count display.
 * @param elements - Popup elements
 */
export async function updateTabCount(elements: PopupElements): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    elements.tabCount.textContent = tabs.length.toString();
  } catch {
    elements.tabCount.textContent = '0';
  }
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
 * Generates and displays QR code for the active tab's URL.
 * @param elements - Popup elements including QR canvas and URL container
 */
export async function generateQRCode(elements: PopupElements): Promise<void> {
  if (!elements.qrCanvas || !elements.qrUrl) {
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (
      !tab ||
      !tab.url ||
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://')
    ) {
      elements.qrUrl.textContent = 'Cannot generate QR for this page';
      return;
    }

    await QRCode.toCanvas(elements.qrCanvas, tab.url, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const displayUrl = tab.url.length > 40 ? tab.url.substring(0, 40) + '...' : tab.url;
    elements.qrUrl.textContent = displayUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    elements.qrUrl.textContent = 'Failed to generate QR code';
  }
}

/**
 * Handles toggle button click.
 * @param elements - Popup elements
 */
export async function handleToggle(elements: PopupElements): Promise<void> {
  try {
    const currentSettings = await getSettings();
    const newEnabled = !currentSettings.enabled;
    await saveSettings({ enabled: newEnabled });
    updateButton(elements, newEnabled);

    if (newEnabled) {
      chrome.runtime.sendMessage({ action: 'runCleanup' });
    }
  } catch (error) {
    console.error('Error toggling auto-clean:', error);
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

  try {
    // Load initial state
    const settings = await getSettings();
    updateButton(elements, settings.enabled);
    applyTheme(settings.theme);
  } catch (error) {
    console.error('Error loading settings:', error);
    // Default to disabled if settings can't be read
    updateButton(elements, false);
  }

  // Update tab count and stats on load
  await updateTabCount(elements);
  await updateStats(elements);

  // Toggle button click
  elements.toggleButton.addEventListener('click', async () => {
    await handleToggle(elements);
  });

  // Settings button click
  elements.settingsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // QR code on demand — generate only when user expands the section
  let qrGenerated = false;
  const qrToggle = document.getElementById('qr-toggle');
  qrToggle?.addEventListener('click', () => {
    const section = qrToggle.closest('.qr-section');
    if (!section) return;
    const isExpanded = section.classList.toggle('expanded');
    if (isExpanded && !qrGenerated) {
      generateQRCode(elements);
      qrGenerated = true;
    }
  });
}

// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  await initPopup();
});
