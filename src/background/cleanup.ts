import type { Settings } from '../shared/settings';
import { getDomain, domainMatches } from '../shared/domain';

/**
 * Identifies duplicate tabs with the same URL.
 * Keeps the most recently accessed tab (or active tab) and marks others as duplicates.
 * @param tabs - Array of Chrome tabs to check
 * @returns Array of tab IDs to close (duplicates)
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
      tabsWithSameUrl.sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      });
      tabsWithSameUrl.slice(1).forEach((tab) => {
        if (tab.id && !tab.active && !tab.pinned) duplicates.push(tab.id);
      });
    }
  });

  return duplicates;
}

/**
 * Input for the pure cleanup computation.
 */
export interface CleanupInput {
  settings: Settings;
  tabs: chrome.tabs.Tab[];
  whitelistedGroupIds: Set<number>;
  now: number;
  getLastActivity: (tab: chrome.tabs.Tab) => number;
}

/**
 * Result of the pure cleanup computation.
 */
export interface CleanupResult {
  tabIdsToClose: number[];
  shouldWarn: boolean;
  tabCount: number;
}

/**
 * Pure function that computes which tabs to close based on cleanup rules.
 * No Chrome API calls — all data is passed in.
 *
 * Rules applied in order:
 *   1. Tab group whitelist — skip tabs in whitelisted groups
 *   2. Domain whitelist — skip tabs on whitelisted domains
 *   3. Blacklist — close tabs on blacklisted domains (if inactive)
 *   4. Idle timeout — close tabs idle beyond configured timeout
 *   5. Duplicate tabs — close duplicate URLs, keep most recently accessed
 *   6. Max tabs — close oldest inactive tabs if over limit
 */
export function computeCleanup(input: CleanupInput): CleanupResult {
  const { settings, tabs, whitelistedGroupIds, now, getLastActivity } = input;
  const idleTimeoutMs = settings.idleTimeout * 60 * 1000;
  const { maxTabs, whitelist, blacklist } = settings;

  const tabsToClose = new Set<number>();

  // Warning threshold: warn when tabs >= maxTabs - 2
  const warningThreshold = maxTabs - 2;
  const shouldWarn = warningThreshold > 0 && tabs.length >= warningThreshold;

  // Sort by last accessed (oldest first) for max-tabs eviction
  const sortedTabs = [...tabs].sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

  // Rules 1-4: evaluate each tab
  tabs.forEach((tab) => {
    if (!tab.id || tab.active || tab.pinned) return;

    const domain = getDomain(tab.url);

    // 1. Tab group whitelist — skip tabs in whitelisted groups
    if (tab.groupId && whitelistedGroupIds.has(tab.groupId)) return;

    // 2. Domain whitelist — skip whitelisted domains
    if (whitelist.some((w) => domainMatches(domain, w))) return;

    // 3. Blacklist — close blacklisted domains (even if recently active)
    if (blacklist.some((b) => domainMatches(domain, b))) {
      tabsToClose.add(tab.id);
      return;
    }

    // 4. Idle timeout — close if idle beyond configured timeout
    const lastActivity = getLastActivity(tab);
    if (lastActivity && now - lastActivity > idleTimeoutMs) {
      tabsToClose.add(tab.id);
    }
  });

  // 5. Duplicate tabs
  const duplicateIds = getDuplicateTabs(tabs);
  duplicateIds.forEach((id) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab && !tab.active && !tab.pinned) {
      const domain = getDomain(tab.url);
      const inWhitelistedGroup = tab.groupId ? whitelistedGroupIds.has(tab.groupId) : false;
      if (!inWhitelistedGroup && !whitelist.some((w) => domainMatches(domain, w))) {
        tabsToClose.add(id);
      }
    }
  });

  // 6. Max tabs — close oldest inactive if over limit
  if (maxTabs > 0) {
    const currentClosingCount = tabsToClose.size;
    const remainingCount = tabs.length - currentClosingCount;

    if (remainingCount > maxTabs) {
      const extraToClose = remainingCount - maxTabs;
      let closedCount = 0;

      for (const tab of sortedTabs) {
        if (closedCount >= extraToClose) break;
        if (tab.id && !tab.active && !tab.pinned && !tabsToClose.has(tab.id)) {
          const domain = getDomain(tab.url);
          const inWhitelistedGroup = tab.groupId ? whitelistedGroupIds.has(tab.groupId) : false;
          if (!inWhitelistedGroup && !whitelist.some((w) => domainMatches(domain, w))) {
            tabsToClose.add(tab.id);
            closedCount++;
          }
        }
      }
    }
  }

  return {
    tabIdsToClose: Array.from(tabsToClose),
    shouldWarn,
    tabCount: tabs.length,
  };
}
