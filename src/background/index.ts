import { getSettings, saveSettings } from '../shared/settings';
import { computeCleanup } from './cleanup';

// Store last activity timestamps for each tab (tabId -> timestamp)
const tabActivityMap: Map<number, number> = new Map();

/**
 * Clears all tab activity records.
 * Used for testing purposes to reset state between tests.
 */
export function resetTabActivityMap(): void {
  tabActivityMap.clear();
}

/**
 * Updates the last activity timestamp for a tab.
 * Called when user interacts with a tab.
 * @param tabId - The ID of the tab to update
 */
export function updateTabActivity(tabId: number): void {
  tabActivityMap.set(tabId, Date.now());
}

/**
 * Gets the last activity timestamp for a tab.
 * Falls back to tab.lastAccessed if no custom record exists.
 * @param tab - The Chrome tab object
 * @returns Timestamp of last activity, or 0 if none
 */
export function getLastActivity(tab: chrome.tabs.Tab): number {
  if (tab.id && tabActivityMap.has(tab.id)) {
    return tabActivityMap.get(tab.id)!;
  }
  return tab.lastAccessed || 0;
}

/**
 * Removes the activity record for a closed tab.
 * @param tabId - The ID of the closed tab
 */
export function removeTabActivity(tabId: number): void {
  tabActivityMap.delete(tabId);
}

// Set warning icon (yellow when warning is active)
export async function setWarningIcon(enable: boolean): Promise<void> {
  const iconPath = enable
    ? {
        16: chrome.runtime.getURL('icons/icon16-yellow.png'),
        48: chrome.runtime.getURL('icons/icon48-yellow.png'),
        128: chrome.runtime.getURL('icons/icon128-yellow.png'),
      }
    : {
        16: chrome.runtime.getURL('icons/icon16.png'),
        48: chrome.runtime.getURL('icons/icon48.png'),
        128: chrome.runtime.getURL('icons/icon128.png'),
      };
  await new Promise<void>((resolve) => {
    chrome.action.setIcon({ path: iconPath }, () => {
      if (chrome.runtime.lastError) {
        console.warn('setIcon error:', chrome.runtime.lastError.message);
      }
      resolve();
    });
  });
}

// Initialize activity tracking for all existing tabs on startup
export async function initializeActivityTracking(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    tabs.forEach((tab) => {
      if (tab.id) {
        // Use existing lastAccessed or current time
        tabActivityMap.set(tab.id, tab.lastAccessed || now);
      }
    });
  } catch (error) {
    console.error('Error initializing activity tracking:', error);
  }
}

export { getDuplicateTabs } from './cleanup';

/** Warning state for tab limit notification */
let warningActive = false;

/**
 * Applies cleanup rules to close tabs based on user settings.
 * Collects Chrome data, delegates to pure computeCleanup(), then applies results.
 * Called periodically by alarm and on various Chrome events.
 */
export async function applyCleanupRules() {
  try {
    const settings = await getSettings();
    if (!settings.enabled) return;

    const { whitelistedTabGroups, notificationsEnabled, maxTabs } = settings;

    // Collect Chrome data
    const allTabs = await chrome.tabs.query({});

    // Resolve whitelisted tab group names to IDs
    const whitelistedGroupIds = new Set<number>();
    if (whitelistedTabGroups.length > 0) {
      try {
        const tabGroups = await chrome.tabGroups.query({});
        for (const group of tabGroups) {
          if (group.title && whitelistedTabGroups.includes(group.title)) {
            whitelistedGroupIds.add(group.id);
          }
        }
      } catch (error) {
        console.error('Error querying tab groups:', error);
      }
    }

    // Pure computation — no Chrome calls
    const result = computeCleanup({
      settings,
      tabs: allTabs,
      whitelistedGroupIds,
      now: Date.now(),
      getLastActivity,
    });

    // Warning state management
    if (result.shouldWarn) {
      if (!warningActive) {
        warningActive = true;
        await setWarningIcon(true);
        if (notificationsEnabled) {
          chrome.notifications.create(
            {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon128.png'),
              title: 'Tab Warning',
              message: `You have ${result.tabCount} tabs open (limit: ${maxTabs}). Consider closing some tabs.`,
            },
            () => {
              if (chrome.runtime.lastError) {
                console.warn('Notification error:', chrome.runtime.lastError.message);
              }
            }
          );
        }
      }
    } else if (warningActive) {
      warningActive = false;
      await setWarningIcon(false);
    }

    // Close tabs and notify
    if (result.tabIdsToClose.length > 0) {
      await chrome.tabs.remove(result.tabIdsToClose);
      console.log('Closed tabs:', result.tabIdsToClose);

      // Track the number of tabs cleaned today (resets each day)
      const today = new Date().toISOString().split('T')[0];
      const stored = (await chrome.storage.local.get(['tabsCleanedToday', 'tabsCleanedDate'])) as {
        tabsCleanedToday?: number;
        tabsCleanedDate?: string;
      };
      const prevCount = stored.tabsCleanedDate === today ? (stored.tabsCleanedToday ?? 0) : 0;
      await chrome.storage.local.set({
        tabsCleanedToday: prevCount + result.tabIdsToClose.length,
        tabsCleanedDate: today,
      });

      if (notificationsEnabled) {
        chrome.notifications.create(
          {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: 'Tabs Cleaned',
            message: `Automatically closed ${result.tabIdsToClose.length} inactive tab(s).`,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.warn('Notification error:', chrome.runtime.lastError.message);
            }
          }
        );
      }
    }
  } catch (error) {
    console.error('Error in applyCleanupRules:', error);
  }
}

// Set up alarm for periodic cleanup
chrome.alarms.create('cleanup', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    applyCleanupRules();
  }
});

// Run immediate cleanup on startup/install
chrome.runtime.onInstalled.addListener(() => {
  applyCleanupRules();
});

chrome.runtime.onStartup.addListener(() => {
  applyCleanupRules();
});

// Listen for manual cleanup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'runCleanup') {
    applyCleanupRules();
    sendResponse({ status: 'started' });
  }
  return true;
});

// --- Tab Activity Tracking ---

// Track when a tab becomes active
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabActivity(activeInfo.tabId);
});

// Track when a tab is updated (navigation, reload, URL change)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Update activity on navigation or when page finishes loading
  if (changeInfo.status === 'loading' || changeInfo.status === 'complete' || changeInfo.url) {
    updateTabActivity(tabId);
  }
});

// Track when a tab is created
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    updateTabActivity(tab.id);
  }
  applyCleanupRules();
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabActivity(tabId);
});

// Reset warning when settings change
export function handleStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  namespace: string,
): void {
  if (namespace === 'sync') {
    if (changes.maxTabs || changes.enabled) {
      warningActive = false;
      setWarningIcon(false).catch(() => {});
    }
    // Immediately apply cleanup rules when maxTabs changes (bug fix)
    if (changes.maxTabs) {
      applyCleanupRules();
    }
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  handleStorageChanged(changes, namespace);
});

// Keyboard shortcuts
export async function handleCommand(command: string): Promise<void> {
  if (command === 'run-cleanup') {
    console.log('Manual cleanup triggered via keyboard shortcut');
    await applyCleanupRules();
  } else if (command === 'toggle-clean') {
    const settings = await getSettings();
    const newEnabled = !settings.enabled;
    await saveSettings({ enabled: newEnabled });
    console.log(`Auto-clean ${newEnabled ? 'enabled' : 'disabled'} via keyboard shortcut`);
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  await handleCommand(command);
});

// Initialize on startup
initializeActivityTracking();
