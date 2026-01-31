import { getSettings, saveSettings } from '../shared/settings';

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

/**
 * Extracts the domain from a URL.
 * @param url - The URL to parse (undefined returns empty string)
 * @returns The hostname, or empty string if invalid
 */
export function getDomain(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Checks if a domain matches a pattern (exact or subdomain match).
 * @param domain - The domain to check
 * @param pattern - The pattern to match against
 * @returns True if domain matches pattern
 * @example domainMatches('mail.google.com', 'google.com') // true
 * @example domainMatches('google.com', 'google.com') // true
 * @example domainMatches('fakegoogle.com', 'google.com') // false
 */
export function domainMatches(domain: string, pattern: string): boolean {
  if (!domain || !pattern) return false;
  // Exact match
  if (domain === pattern) return true;
  // Subdomain match (e.g., "mail.google.com" matches "google.com")
  if (domain.endsWith('.' + pattern)) return true;
  return false;
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
  } catch (error) {
    console.error('Error setting icon:', error);
  }
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

/**
 * Identifies duplicate tabs with the same URL.
 * Keeps the most recently accessed tab (or active tab) and marks others as duplicates.
 * @param tabs - Array of Chrome tabs to check
 * @returns Array of tab IDs to close (duplicates)
 * @example
 * const tabs = [{ id: 1, url: 'https://example.com' }, { id: 2, url: 'https://example.com' }];
 * const duplicates = getDuplicateTabs(tabs); // [1]
 */
export function getDuplicateTabs(tabs: chrome.tabs.Tab[]): number[] {
  const duplicates: number[] = [];
  const urlMap: Map<string, chrome.tabs.Tab[]> = new Map();

  tabs.forEach((tab) => {
    if (!tab.url) return;
    if (!urlMap.has(tab.url)) {
      urlMap.set(tab.url, []);
    }
    urlMap.get(tab.url)!.push(tab);
  });

  urlMap.forEach((tabsWithSameUrl) => {
    if (tabsWithSameUrl.length > 1) {
      // Sort by last accessed, keep the most recent (lastAccessed is larger)
      // But always prioritize active tabs (they should never be marked as duplicates)
      tabsWithSameUrl.sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      });
      // All except the first one are duplicates (active tab will be first if present)
      tabsWithSameUrl.slice(1).forEach((tab) => {
        if (tab.id && !tab.active) duplicates.push(tab.id);
      });
    }
  });

  return duplicates;
}

/** Warning state for tab limit notification */
let warningActive = false;

/**
 * Applies cleanup rules to close tabs based on user settings.
 * Rules applied in order: whitelist, blacklist, idle timeout, duplicates, max tabs.
 * Called periodically by alarm and on various Chrome events.
 */
export async function applyCleanupRules() {
  try {
    const settings = await getSettings();
    if (!settings.enabled) return;

    const idleTimeoutMs = settings.idleTimeout * 60 * 1000;
    const { maxTabs, whitelist, blacklist, notificationsEnabled } = settings;

    const tabsToClose = new Set<number>();
    const now = Date.now();

    // Get all tabs
    const allTabs = await chrome.tabs.query({});

    // Warning check: when tabs >= maxTabs - 2
    const warningThreshold = maxTabs - 2;
    if (warningThreshold > 0 && allTabs.length >= warningThreshold) {
      if (!warningActive) {
        warningActive = true;
        await setWarningIcon(true);
        if (notificationsEnabled) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: 'Tab Warning',
            message: `You have ${allTabs.length} tabs open (limit: ${maxTabs}). Consider closing some tabs.`,
          });
        }
      }
    } else if (allTabs.length < warningThreshold && warningActive) {
      warningActive = false;
      await setWarningIcon(false);
    }

    // Sort all tabs by last accessed (oldest first)
    const sortedTabs = [...allTabs].sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

    allTabs.forEach((tab) => {
      if (!tab.id || tab.active) return; // Never close the active tab

      const domain = getDomain(tab.url);

      // 1. Whitelist check (skip whitelisted)
      if (whitelist.some((w) => domainMatches(domain, w))) return;

      // 2. Blacklist check (always close if in blacklist and not active)
      if (blacklist.some((b) => domainMatches(domain, b))) {
        tabsToClose.add(tab.id);
        return;
      }

      // 3. Idle timeout check (uses custom activity tracking)
      const lastActivity = getLastActivity(tab);
      if (lastActivity && now - lastActivity > idleTimeoutMs) {
        tabsToClose.add(tab.id);
      }
    });

    // 4. Duplicate tabs check
    const duplicates = getDuplicateTabs(allTabs);
    duplicates.forEach((id) => {
      // Re-verify it's not whitelisted or active (though getDuplicateTabs check URL, active tab might be one of them)
      const tab = allTabs.find((t) => t.id === id);
      if (tab && !tab.active) {
        const domain = getDomain(tab.url);
        if (!whitelist.some((w) => domainMatches(domain, w))) {
          tabsToClose.add(id);
        }
      }
    });

    // 5. Max tabs check (close oldest inactive until below limit)
    const currentClosingCount = tabsToClose.size;
    const remainingCount = allTabs.length - currentClosingCount;

    if (remainingCount > maxTabs) {
      const extraToClose = remainingCount - maxTabs;
      let closedCount = 0;

      for (const tab of sortedTabs) {
        if (closedCount >= extraToClose) break;
        if (tab.id && !tab.active && !tabsToClose.has(tab.id)) {
          const domain = getDomain(tab.url);
          if (!whitelist.some((w) => domainMatches(domain, w))) {
            tabsToClose.add(tab.id);
            closedCount++;
          }
        }
      }
    }

    const finalIdsToClose = Array.from(tabsToClose);

    if (finalIdsToClose.length > 0) {
      await chrome.tabs.remove(finalIdsToClose);
      console.log('Closed tabs:', finalIdsToClose);

      if (notificationsEnabled) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title: 'Tabs Cleaned',
          message: `Automatically closed ${finalIdsToClose.length} inactive tab(s).`,
        });
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
  if (namespace === 'local') {
    if (changes.maxTabs || changes.enabled) {
      warningActive = false;
      setWarningIcon(false).catch(() => {});
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
