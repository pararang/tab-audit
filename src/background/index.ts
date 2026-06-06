import { getSettings, saveSettings } from '../shared/settings';
import { computeCleanup } from './cleanup';

// Store last activity timestamps for each tab (tabId -> timestamp)
const tabActivityMap: Map<number, number> = new Map();

// Debounce timer for persisting tabActivityMap
let persistTimer: ReturnType<typeof setTimeout> | null = null;

// Storage key for tab activity map
const TAB_ACTIVITY_KEY = 'tabActivityMap';

/**
 * Persists the tabActivityMap to chrome.storage.local.
 * Uses debouncing to avoid excessive writes.
 */
export function schedulePersistTabActivityMap(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const obj: Record<string, number> = {};
    tabActivityMap.forEach((value, key) => {
      obj[key.toString()] = value;
    });
    chrome.storage.local.set({ [TAB_ACTIVITY_KEY]: obj }).catch((err) => {
      console.error('Error persisting tabActivityMap:', err);
    });
  }, 500);
}

/**
 * Loads the tabActivityMap from chrome.storage.local.
 * Returns a Map of tabId -> timestamp, or an empty Map if nothing stored.
 */
export async function loadTabActivityMap(): Promise<Map<number, number>> {
  try {
    const stored = (await chrome.storage.local.get(TAB_ACTIVITY_KEY)) as {
      [TAB_ACTIVITY_KEY]?: Record<string, number>;
    };
    const raw = stored[TAB_ACTIVITY_KEY];
    if (raw && typeof raw === 'object') {
      const restored = new Map<number, number>();
      for (const [key, value] of Object.entries(raw)) {
        const numKey = Number(key);
        if (!isNaN(numKey) && typeof value === 'number') {
          restored.set(numKey, value);
        }
      }
      return restored;
    }
  } catch (err) {
    console.error('Error loading tabActivityMap:', err);
  }
  return new Map();
}

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
  schedulePersistTabActivityMap();
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
  schedulePersistTabActivityMap();
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
  try {
    await chrome.action.setIcon({ path: iconPath });
  } catch (err) {
    console.warn('setIcon error:', err);
  }
}

// Initialize activity tracking for all existing tabs on startup
export async function initializeActivityTracking(): Promise<void> {
  try {
    const restored = await loadTabActivityMap();
    tabActivityMap.clear();
    restored.forEach((value, key) => tabActivityMap.set(key, value));

    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const currentTabIds = new Set<number>();
    tabs.forEach((tab) => {
      if (tab.id) {
        currentTabIds.add(tab.id);
        if (!tabActivityMap.has(tab.id)) {
          tabActivityMap.set(tab.id, tab.lastAccessed || now);
        }
      }
    });

    let staleRemoved = 0;
    tabActivityMap.forEach((_, key) => {
      if (!currentTabIds.has(key)) {
        tabActivityMap.delete(key);
        staleRemoved++;
      }
    });
    if (staleRemoved > 0) {
      schedulePersistTabActivityMap();
    }
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
let cleanupInProgress = false;

export async function applyCleanupRules() {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
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
          try {
            await chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon128.png'),
              title: 'Tab Warning',
              message: `You have ${result.tabCount} tabs open (limit: ${maxTabs}). Consider closing some tabs.`,
            });
          } catch (err) {
            console.warn('Notification error:', err);
          }
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
        try {
          await chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: 'Tabs Cleaned',
            message: `Automatically closed ${result.tabIdsToClose.length} inactive tab(s).`,
          });
        } catch (err) {
          console.warn('Notification error:', err);
        }
      }
    }
  } catch (error) {
    console.error('Error in applyCleanupRules:', error);
  } finally {
    cleanupInProgress = false;
  }
}

// Set up alarm for periodic cleanup
chrome.alarms.create('cleanup', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    applyCleanupRules().catch((err) => console.error('Alarm cleanup error:', err));
  }
});

// Run immediate cleanup on startup/install
chrome.runtime.onInstalled.addListener(() => {
  applyCleanupRules().catch((err) => console.error('onInstalled cleanup error:', err));
});

chrome.runtime.onStartup.addListener(() => {
  applyCleanupRules().catch((err) => console.error('onStartup cleanup error:', err));
});

// Listen for manual cleanup requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'runCleanup') {
    applyCleanupRules()
      .then(() => sendResponse({ status: 'started' }))
      .catch((err) => {
        console.error('Message cleanup error:', err);
        sendResponse({ status: 'error' });
      });
    return true; // keep channel open for async sendResponse
  }
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
  applyCleanupRules().catch((err) => console.error('onCreated cleanup error:', err));
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
      applyCleanupRules().catch((err) => console.error('Storage change cleanup error:', err));
    }
  } else if (namespace === 'local') {
    // Domain lists changed in local storage - re-apply cleanup rules
    if (changes.whitelist || changes.blacklist || changes.whitelistedTabGroups) {
      applyCleanupRules().catch((err) => console.error('Local storage change cleanup error:', err));
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
    try {
      const settings = await getSettings();
      const newEnabled = !settings.enabled;
      await saveSettings({ enabled: newEnabled });
      console.log(`Auto-clean ${newEnabled ? 'enabled' : 'disabled'} via keyboard shortcut`);
    } catch (error) {
      console.error('Error toggling auto-clean via shortcut:', error);
    }
  }
}

chrome.commands.onCommand.addListener((command) => {
  handleCommand(command).catch((err) => console.error('Command error:', err));
});

// Initialize on startup
initializeActivityTracking();
