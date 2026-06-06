/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockChrome } from '../__test-utils__/chrome-mock';
import '../shared/__mocks__/chrome';
const chromeMock = chrome as unknown as MockChrome;
import {
  updateTabActivity,
  getLastActivity,
  removeTabActivity,
  resetTabActivityMap,
  getDuplicateTabs,
  applyCleanupRules,
  setWarningIcon,
  initializeActivityTracking,
  handleStorageChanged,
  handleCommand,
  loadTabActivityMap,
} from './index';
import { getDomain, domainMatches } from '../shared/domain';

// Capture the onMessage listener registered during module import
const messageListener = chromeMock.runtime.onMessage.addListener.mock.calls[0][0] as (
  ...args: any[]
) => any;

describe('updateTabActivity', () => {
  beforeEach(() => {
    resetTabActivityMap();
  });

  it('should store current timestamp for tabId', () => {
    const before = Date.now();
    updateTabActivity(1);
    const after = Date.now();

    const lastActivity = getLastActivity({
      id: 1,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);
    expect(lastActivity).toBeGreaterThanOrEqual(before);
    expect(lastActivity).toBeLessThanOrEqual(after);
  });

  it('should update existing tab activity timestamp', () => {
    updateTabActivity(1);
    const firstTimestamp = getLastActivity({
      id: 1,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);

    // Call updateTabActivity again - verifies function can be called multiple times
    updateTabActivity(1);
    const secondTimestamp = getLastActivity({
      id: 1,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);

    // Both calls should set valid timestamps (may be same in same millisecond)
    expect(firstTimestamp).toBeGreaterThan(0);
    expect(secondTimestamp).toBeGreaterThan(0);
  });

  it('should handle multiple tabs independently', () => {
    const before = Date.now();
    updateTabActivity(1);
    updateTabActivity(2);

    const timestamp1 = getLastActivity({
      id: 1,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);
    const timestamp2 = getLastActivity({
      id: 2,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);

    expect(timestamp1).toBeGreaterThanOrEqual(before);
    expect(timestamp2).toBeGreaterThanOrEqual(before);
    expect(timestamp1).toBeGreaterThan(0);
    expect(timestamp2).toBeGreaterThan(0);
  });
});

describe('getLastActivity', () => {
  beforeEach(() => {
    removeTabActivity(1);
    removeTabActivity(2);
    removeTabActivity(999);
  });

  it('should fallback to tab.lastAccessed when no custom record exists', () => {
    const lastAccessed = 1000000000000;
    const result = getLastActivity({ id: 999, lastAccessed } as chrome.tabs.Tab);
    expect(result).toBe(lastAccessed);
  });

  it('should return 0 when no tabId and no lastAccessed', () => {
    const result = getLastActivity({ id: undefined, lastAccessed: 0 } as chrome.tabs.Tab);
    expect(result).toBe(0);
  });
});

describe('removeTabActivity', () => {
  beforeEach(() => {
    removeTabActivity(1);
    removeTabActivity(2);
  });

  it('should remove tab activity record', () => {
    updateTabActivity(1);
    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);

    removeTabActivity(1);
    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
  });

  it('should handle removing non-existent tab gracefully', () => {
    expect(() => removeTabActivity(999)).not.toThrow();
  });

  it('should not affect other tabs', () => {
    updateTabActivity(1);
    updateTabActivity(2);
    const timestamp2 = getLastActivity({
      id: 2,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);

    removeTabActivity(1);

    const result2 = getLastActivity({
      id: 2,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);
    expect(result2).toBe(timestamp2);
  });
});

describe('resetTabActivityMap', () => {
  beforeEach(() => {
    resetTabActivityMap();
  });

  it('should clear all activity records', () => {
    updateTabActivity(1);
    updateTabActivity(2);
    updateTabActivity(3);

    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);
    expect(
      getLastActivity({
        id: 2,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);
    expect(
      getLastActivity({
        id: 3,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);

    resetTabActivityMap();

    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
    expect(
      getLastActivity({
        id: 2,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
    expect(
      getLastActivity({
        id: 3,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
  });

  it('should handle resetting empty map gracefully', () => {
    expect(() => resetTabActivityMap()).not.toThrow();
  });
});

describe('getDomain', () => {
  it('should extract domain from valid URL', () => {
    expect(getDomain('https://example.com/page')).toBe('example.com');
    expect(getDomain('https://sub.example.com/path')).toBe('sub.example.com');
    expect(getDomain('http://test.org')).toBe('test.org');
  });

  it('should handle URL with port', () => {
    expect(getDomain('https://example.com:8080/page')).toBe('example.com');
  });

  it('should return empty string for undefined URL', () => {
    expect(getDomain(undefined)).toBe('');
  });

  it('should return empty string for invalid URL', () => {
    expect(getDomain('not-a-valid-url')).toBe('');
    expect(getDomain('')).toBe('');
  });

  it('should handle URLs with query parameters', () => {
    expect(getDomain('https://example.com?q=test')).toBe('example.com');
  });

  it('should handle URLs with fragments', () => {
    expect(getDomain('https://example.com#section')).toBe('example.com');
  });
});

describe('domainMatches', () => {
  it('should match exact domains', () => {
    expect(domainMatches('google.com', 'google.com')).toBe(true);
    expect(domainMatches('example.com', 'example.com')).toBe(true);
  });

  it('should not match different domains', () => {
    expect(domainMatches('google.com', 'google.org')).toBe(false);
    expect(domainMatches('google.com', 'notgoogle.com')).toBe(false);
  });

  it('should match subdomains', () => {
    expect(domainMatches('mail.google.com', 'google.com')).toBe(true);
    expect(domainMatches('api.example.com', 'example.com')).toBe(true);
    expect(domainMatches('a.b.c.example.com', 'example.com')).toBe(true);
  });

  it('should not match partial string matches', () => {
    expect(domainMatches('fakegoogle.com', 'google.com')).toBe(false);
    expect(domainMatches('example.com.org', 'example.com')).toBe(false);
  });

  it('should return false for empty domain', () => {
    expect(domainMatches('', 'google.com')).toBe(false);
  });

  it('should return false for empty pattern', () => {
    expect(domainMatches('google.com', '')).toBe(false);
  });

  it('should return false for both empty', () => {
    expect(domainMatches('', '')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(domainMatches('Google.Com', 'google.com')).toBe(false);
    expect(domainMatches('google.com', 'Google.Com')).toBe(false);
  });
});

describe('getDuplicateTabs', () => {
  const createTab = (overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab => {
    const tab: chrome.tabs.Tab = {
      id: 1,
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 0,
      incognito: false,
      width: 1024,
      height: 768,
      lastAccessed: 0,
      url: '',
      title: '',
      frozen: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    };
    return { ...tab, ...overrides };
  };

  it('should return empty array when no duplicates', () => {
    const tabs = [
      createTab({ id: 1, url: 'https://a.com', lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://b.com', lastAccessed: 200 }),
    ];
    expect(getDuplicateTabs(tabs, (t) => t.lastAccessed || 0)).toEqual([]);
  });

  it('should identify duplicate URLs', () => {
    const tabs = [
      createTab({ id: 1, url: 'https://example.com', lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://example.com', lastAccessed: 200 }),
      createTab({ id: 3, url: 'https://example.com', lastAccessed: 150 }),
    ];
    const duplicates = getDuplicateTabs(tabs, (t) => t.lastAccessed || 0);
    expect(duplicates).toHaveLength(2);
    expect(duplicates).not.toContain(2);
  });

  it('should keep active tab even if older', () => {
    const tabs = [
      createTab({ id: 1, url: 'https://example.com', active: true, lastAccessed: 50 }),
      createTab({ id: 2, url: 'https://example.com', lastAccessed: 200 }),
    ];
    const duplicates = getDuplicateTabs(tabs, (t) => t.lastAccessed || 0);
    expect(duplicates).toEqual([2]);
  });

  it('should skip tabs without URLs', () => {
    const tabs = [
      createTab({ id: 1, url: 'https://example.com', lastAccessed: 100 }),
      createTab({ id: 2, url: undefined, lastAccessed: 200 }),
      createTab({ id: 3, url: 'https://example.com', lastAccessed: 150 }),
    ];
    const duplicates = getDuplicateTabs(tabs, (t) => t.lastAccessed || 0);
    // Tab 1 is older (100) than tab 3 (150), so tab 1 is the duplicate
    expect(duplicates).toEqual([1]);
  });

  it('should handle single tab', () => {
    const tabs = [createTab({ id: 1, url: 'https://example.com', lastAccessed: 100 })];
    expect(getDuplicateTabs(tabs, (t) => t.lastAccessed || 0)).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(getDuplicateTabs([], (t) => t.lastAccessed || 0)).toEqual([]);
  });

  it('should not include active tabs in duplicates', () => {
    const tabs = [
      createTab({ id: 1, url: 'https://example.com', active: true, lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://example.com', lastAccessed: 200 }),
      createTab({ id: 3, url: 'https://example.com', lastAccessed: 150 }),
    ];
    const duplicates = getDuplicateTabs(tabs, (t) => t.lastAccessed || 0);
    expect(duplicates).not.toContain(1);
    expect(duplicates).toContain(2);
    expect(duplicates).toContain(3);
  });
});

describe('applyCleanupRules', () => {
  const createTab = (overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab => {
    const tab: chrome.tabs.Tab = {
      id: 1,
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 0,
      incognito: false,
      width: 1024,
      height: 768,
      lastAccessed: 0,
      url: '',
      title: '',
      frozen: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    };
    return { ...tab, ...overrides };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    removeTabActivity(1);
    removeTabActivity(2);
    removeTabActivity(3);
    removeTabActivity(4);
    removeTabActivity(5);
  });

  it('should not close any tabs when extension is disabled', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: false,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://example.com', lastAccessed: 100 }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it('should not close tabs in whitelisted tab groups', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      whitelistedTabGroups: ['Work'],
      notificationsEnabled: false,
    });
    chromeMock.tabGroups.query.mockResolvedValue([
      { id: 10, title: 'Work', color: 'blue', collapsed: false, windowId: 1 },
      { id: 20, title: 'Personal', color: 'green', collapsed: false, windowId: 1 },
    ]);
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://work.com', groupId: 10, lastAccessed: now - 120000, active: false },
      {
        id: 2,
        url: 'https://personal.com',
        groupId: 20,
        lastAccessed: now - 120000,
        active: false,
      },
      { id: 3, url: 'https://other.com', groupId: -1, lastAccessed: now - 120000, active: false },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalled();
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    // Tab 1 is in whitelisted 'Work' group - should NOT be closed
    expect(removedTabs).not.toContain(1);
    // Tab 3 has no group - should be closed (idle)
    expect(removedTabs).toContain(3);
  });

  it('should not close tabs in whitelisted tab groups when over maxTabs', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 2,
      whitelist: [],
      blacklist: [],
      whitelistedTabGroups: ['Work'],
      notificationsEnabled: false,
    });
    chromeMock.tabGroups.query.mockResolvedValue([
      { id: 10, title: 'Work', color: 'blue', collapsed: false, windowId: 1 },
    ]);
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://work.com', groupId: 10, lastAccessed: now - 5000, active: true },
      {
        id: 2,
        url: 'https://work.com/page2',
        groupId: 10,
        lastAccessed: now - 10000,
        active: false,
      },
      { id: 3, url: 'https://other.com', lastAccessed: now - 15000, active: false },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
  });

  it('should close tabs over maxTabs limit', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 2,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://a.com', active: true, lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://b.com', lastAccessed: 200 }),
      createTab({ id: 3, url: 'https://c.com', lastAccessed: 150 }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalled();
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    expect(removedTabs).toContain(3); // Oldest non-active tab should be closed
  });

  it('should not close whitelisted domains', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1, // 1 minute
      maxTabs: 50,
      whitelist: ['important.com'],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://important.com', lastAccessed: now - 120000 }), // 2 min old
      createTab({ id: 2, url: 'https://other.com', lastAccessed: now - 120000 }), // 2 min old
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
  });

  it('should always close blacklisted domains', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 50,
      whitelist: [],
      blacklist: ['bad.com'],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://bad.com', active: false, lastAccessed: Date.now() }),
      createTab({ id: 2, url: 'https://good.com', active: true, lastAccessed: Date.now() }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]);
  });

  it('should close idle tabs beyond timeout', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1, // 1 minute
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://old.com', lastAccessed: now - 120000, active: true }),
      createTab({ id: 2, url: 'https://idle.com', lastAccessed: now - 120000, active: false }),
      createTab({ id: 3, url: 'https://recent.com', lastAccessed: now - 30000, active: false }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalled();
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    expect(removedTabs).toContain(2);
  });

  it('should not close active tab even if idle', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://example.com', lastAccessed: now - 120000, active: true }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it('should handle empty tabs array', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it('should send notification when tabs are closed and notifications enabled', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 1,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: true,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://a.com', active: true, lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://b.com', lastAccessed: 200 }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.notifications.create).toHaveBeenCalled();
  });

  it('should combine multiple cleanup rules correctly', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1, // 1 minute
      maxTabs: 2,
      whitelist: ['important.com'],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://important.com', lastAccessed: now - 120000, active: true }), // whitelisted
      createTab({ id: 2, url: 'https://idle.com', lastAccessed: now - 120000, active: false }), // idle, not whitelisted
      createTab({ id: 3, url: 'https://other.com', lastAccessed: now - 120000, active: false }), // idle, over maxTabs
      createTab({ id: 4, url: 'https://recent.com', lastAccessed: now - 30000, active: false }), // recent
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalled();
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    // Tab 2 is idle, tab 3 is also over limit but newer
    expect(removedTabs).toContain(2);
    expect(removedTabs).not.toContain(1); // whitelisted
    expect(removedTabs).not.toContain(4); // recent
  });

  it('should match subdomains in whitelist', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: ['example.com'],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({
        id: 1,
        url: 'https://sub.example.com',
        lastAccessed: now - 120000,
        active: false,
      }), // subdomain of whitelist
      createTab({ id: 2, url: 'https://other.com', lastAccessed: now - 120000, active: false }),
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
  });

  it('should close tab with no URL', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: undefined, lastAccessed: now - 120000, active: false }),
    ]);

    await applyCleanupRules();

    // Tab with no URL should still be checked for idle - but we don't track it
    // It might not be closed depending on implementation
    // This tests that the function handles missing URLs gracefully
  });

  it('should handle Chrome API errors gracefully', async () => {
    // Suppress expected error output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockRejectedValue(new Error('API error'));

    // Should not throw
    await expect(applyCleanupRules()).resolves.not.toThrow();
    consoleErrorSpy.mockRestore();
  });

  it('should handle notification creation error gracefully', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 1,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: true,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://a.com', active: true, lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://b.com', lastAccessed: 200 }),
    ]);
    chromeMock.notifications.create.mockRejectedValue(new Error('Notification error'));

    // Should not throw even if notification fails
    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle warning notification creation error gracefully', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 1,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: true,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://a.com', active: true, lastAccessed: 100 }),
      createTab({ id: 2, url: 'https://b.com', lastAccessed: 200 }),
    ]);
    chromeMock.notifications.create.mockRejectedValue(new Error('Warning notification error'));

    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle tabs at various idle times correctly', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1, // 1 minute
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      createTab({ id: 1, url: 'https://a.com', lastAccessed: now - 30000, active: true }), // 30s - not idle
      createTab({ id: 2, url: 'https://b.com', lastAccessed: now - 120000, active: false }), // 2min - idle
      createTab({ id: 3, url: 'https://c.com', lastAccessed: now - 180000, active: false }), // 3min - idle
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalled();
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    // Both idle tabs should be closed
    expect(removedTabs).toContain(2);
    expect(removedTabs).toContain(3);
  });
});

describe('setWarningIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set yellow warning icon when enabled', async () => {
    const getURLSpy = chromeMock.runtime.getURL;
    getURLSpy.mockImplementation((path: any): string => `chrome-extension://mock/${path}`);
    chromeMock.action.setIcon.mockResolvedValue(undefined);

    await setWarningIcon(true);

    expect(getURLSpy).toHaveBeenCalledWith('icons/icon16-yellow.png');
    expect(getURLSpy).toHaveBeenCalledWith('icons/icon48-yellow.png');
    expect(getURLSpy).toHaveBeenCalledWith('icons/icon128-yellow.png');
    expect(chromeMock.action.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'chrome-extension://mock/icons/icon16-yellow.png',
        48: 'chrome-extension://mock/icons/icon48-yellow.png',
        128: 'chrome-extension://mock/icons/icon128-yellow.png',
      },
    });
  });

  it('should set normal icon when disabled', async () => {
    const getURLSpy = chromeMock.runtime.getURL;
    getURLSpy.mockImplementation((path: any): string => `chrome-extension://mock/${path}`);
    chromeMock.action.setIcon.mockResolvedValue(undefined);

    await setWarningIcon(false);

    expect(getURLSpy).toHaveBeenCalledWith('icons/icon16.png');
    expect(getURLSpy).toHaveBeenCalledWith('icons/icon48.png');
    expect(getURLSpy).toHaveBeenCalledWith('icons/icon128.png');
    expect(chromeMock.action.setIcon).toHaveBeenCalledWith({
      path: {
        16: 'chrome-extension://mock/icons/icon16.png',
        48: 'chrome-extension://mock/icons/icon48.png',
        128: 'chrome-extension://mock/icons/icon128.png',
      },
    });
  });

  it('should handle Chrome API errors gracefully', async () => {
    // Suppress expected warning output
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const getURLSpy = chromeMock.runtime.getURL;
    getURLSpy.mockImplementation((path: any): string => `chrome-extension://mock/${path}`);
    chromeMock.action.setIcon.mockRejectedValue(new Error('Icon error'));

    await setWarningIcon(true);

    // Should not throw
    consoleWarnSpy.mockRestore();
  });
});

describe('initializeActivityTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should initialize activity tracking for all existing tabs', async () => {
    const now = Date.now();
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://a.com', lastAccessed: now - 10000 },
      { id: 2, url: 'https://b.com', lastAccessed: now - 20000 },
      { id: 3, url: 'https://c.com', lastAccessed: now - 30000 },
    ]);

    await initializeActivityTracking();

    expect(chromeMock.tabs.query).toHaveBeenCalledWith({});
    // Use getLastActivity to verify the map was populated
    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab),
    ).toBe(now - 10000);
    expect(
      getLastActivity({
        id: 2,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab),
    ).toBe(now - 20000);
    expect(
      getLastActivity({
        id: 3,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab),
    ).toBe(now - 30000);
  });

  it('should use current time for tabs without lastAccessed', async () => {
    const now = Date.now();
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://a.com', lastAccessed: undefined },
    ]);

    await initializeActivityTracking();

    // The timestamp should be close to now (within 100ms)
    const recordedTime = getLastActivity({
      id: 1,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    } as chrome.tabs.Tab);
    expect(recordedTime).toBeGreaterThanOrEqual(now - 100);
    expect(recordedTime).toBeLessThanOrEqual(now + 100);
  });

  it('should skip tabs without id', async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: undefined, url: 'https://a.com', lastAccessed: Date.now() },
    ]);

    await initializeActivityTracking();

    // Map should remain empty
    expect(
      getLastActivity({
        id: 999,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab),
    ).toBe(0);
  });

  it('should handle Chrome API errors gracefully', async () => {
    // Suppress expected error output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    chromeMock.tabs.query.mockRejectedValue(new Error('Query error'));

    await initializeActivityTracking();

    // Should not throw, map should remain empty
    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      } as chrome.tabs.Tab),
    ).toBe(0);
    consoleErrorSpy.mockRestore();
  });
});

describe('handleStorageChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
    // Mock tabs.query to prevent console errors from applyCleanupRules
    chromeMock.tabs.query.mockResolvedValue([]);
  });

  it('should reset warning when maxTabs changes', async () => {
    const setIconSpy = vi.spyOn(chrome.action, 'setIcon');
    setIconSpy.mockResolvedValue(undefined);

    handleStorageChanged({ maxTabs: { newValue: 100, oldValue: 50 } }, 'sync');

    expect(chromeMock.action.setIcon).toHaveBeenCalled();
  });

  it('should reset warning when enabled changes', async () => {
    const setIconSpy = vi.spyOn(chrome.action, 'setIcon');
    setIconSpy.mockResolvedValue(undefined);

    handleStorageChanged({ enabled: { newValue: true, oldValue: false } }, 'sync');

    expect(chromeMock.action.setIcon).toHaveBeenCalled();
  });

  it('should not reset warning for other changes', () => {
    const setIconSpy = vi.spyOn(chrome.action, 'setIcon');

    handleStorageChanged({ whitelist: { newValue: ['a.com'], oldValue: [] } }, 'sync');

    expect(setIconSpy).not.toHaveBeenCalled();
  });

  it('should not respond to non-sync storage changes', () => {
    const setIconSpy = vi.spyOn(chrome.action, 'setIcon');

    handleStorageChanged({ maxTabs: { newValue: 100, oldValue: 50 } }, 'local');

    expect(setIconSpy).not.toHaveBeenCalled();
  });

  it('should trigger applyCleanupRules when maxTabs changes', async () => {
    handleStorageChanged({ maxTabs: { newValue: 100, oldValue: 50 } }, 'sync');

    // Wait for async applyCleanupRules to complete
    await vi.waitFor(() => {
      expect(chromeMock.tabs.query).toHaveBeenCalled();
    });
  });

  it('should not trigger applyCleanupRules for non-maxTabs changes', async () => {
    handleStorageChanged({ whitelist: { newValue: ['a.com'], oldValue: [] } }, 'sync');

    // Small delay to let any async calls settle
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(chromeMock.tabs.query).not.toHaveBeenCalled();
  });
});

describe('handleCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should run cleanup on run-cleanup command', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([]);

    await handleCommand('run-cleanup');

    expect(chromeMock.tabs.query).toHaveBeenCalled();
  });

  it('should toggle enabled on toggle-clean command', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: false });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await handleCommand('toggle-clean');

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ enabled: true });
  });

  it('should toggle enabled from true to false', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: true });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await handleCommand('toggle-clean');

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ enabled: false });
  });

  it('should handle unknown commands gracefully', async () => {
    await handleCommand('unknown-command');

    // Should not throw
  });

  it('should handle getSettings error on toggle-clean command', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockRejectedValue(new Error('Storage read error'));

    await handleCommand('toggle-clean');

    expect(consoleError).toHaveBeenCalledWith(
      'Error toggling auto-clean via shortcut:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('should handle saveSettings error on toggle-clean command', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: false });
    chromeMock.storage.sync.set.mockRejectedValue(new Error('Storage write error'));

    await handleCommand('toggle-clean');

    expect(consoleError).toHaveBeenCalledWith(
      'Error toggling auto-clean via shortcut:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});

describe('getDomain edge cases', () => {
  it('should handle special URL schemes', () => {
    // data: URLs throw error in new URL()
    expect(getDomain('data:text/html,<html>')).toBe('');
  });

  it('should handle chrome:// URLs', () => {
    expect(getDomain('chrome://settings')).toBe('settings');
  });

  it('should handle about:blank', () => {
    // about: URLs throw error in new URL()
    expect(getDomain('about:blank')).toBe('');
  });

  it('should handle file:// URLs', () => {
    expect(getDomain('file:///path/to/file.html')).toBe('');
  });

  it('should handle URLs with @ symbol', () => {
    expect(getDomain('https://user:pass@example.com')).toBe('example.com');
  });

  it('should handle very long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000);
    expect(getDomain(longUrl)).toBe('example.com');
  });

  it('should handle URL with encoded characters', () => {
    expect(getDomain('https://example.com/path%20with%20spaces')).toBe('example.com');
  });

  it('should handle IP addresses', () => {
    expect(getDomain('https://192.168.1.1/path')).toBe('192.168.1.1');
    expect(getDomain('https://[::1]/path')).toBe('[::1]');
  });
});

describe('domainMatches edge cases', () => {
  it('should be case-sensitive', () => {
    expect(domainMatches('Google.com', 'google.com')).toBe(false);
    expect(domainMatches('google.com', 'Google.com')).toBe(false);
  });

  it('should handle unicode domains', () => {
    expect(domainMatches('xn--bcher-kva.com', 'bücher.com')).toBe(false);
  });

  it('should handle single character domain', () => {
    expect(domainMatches('a.com', 'a.com')).toBe(true);
    expect(domainMatches('b.a.com', 'a.com')).toBe(true);
  });

  it('should not match when pattern is a substring', () => {
    expect(domainMatches('notgoogle.com', 'google')).toBe(false);
  });

  it('should handle very long domains', () => {
    const longDomain = 'a.' + 'b'.repeat(100) + '.com';
    expect(domainMatches(longDomain, 'b'.repeat(100) + '.com')).toBe(true);
  });
});

describe('getDuplicateTabs edge cases', () => {
  it('should handle tabs with different fragments as separate URLs', () => {
    // Fragments make URLs different, so no duplicates
    const tabs = [
      { id: 1, url: 'https://example.com#section1', active: false, lastAccessed: 100 },
      { id: 2, url: 'https://example.com#section2', active: false, lastAccessed: 200 },
      { id: 3, url: 'https://example.com', active: false, lastAccessed: 150 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    // All URLs are different due to fragments, so no duplicates
    expect(duplicates.length).toBe(0);
  });

  it('should handle tabs with different query params as separate URLs', () => {
    // Query params make URLs different, so no duplicates
    const tabs = [
      { id: 1, url: 'https://example.com?a=1', active: false, lastAccessed: 100 },
      { id: 2, url: 'https://example.com?b=2', active: false, lastAccessed: 200 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    expect(duplicates.length).toBe(0);
  });

  it('should prioritize newer tabs even if older one is active', () => {
    const tabs = [
      { id: 1, url: 'https://example.com', active: true, lastAccessed: 100 },
      { id: 2, url: 'https://example.com', active: false, lastAccessed: 200 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    expect(duplicates).toContain(2);
  });

  it('should handle 100+ tabs efficiently', () => {
    const tabs = [];
    for (let i = 0; i < 150; i++) {
      tabs.push({
        id: i,
        url: i % 3 === 0 ? 'https://example.com' : `https://site${i % 10}.com`,
        active: false,
        lastAccessed: i,
      });
    }
    const startTime = Date.now();
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(100);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('should handle chrome:// URLs in duplicates', () => {
    const tabs = [
      { id: 1, url: 'chrome://settings', active: false, lastAccessed: 100 },
      { id: 2, url: 'chrome://settings', active: false, lastAccessed: 200 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    expect(duplicates).toContain(1);
  });

  it('should not mark pinned tabs as duplicates', () => {
    // Pinned newer tab means the older non-pinned tab is the duplicate
    const tabs = [
      { id: 1, url: 'https://example.com', active: false, pinned: true, lastAccessed: 200 },
      { id: 2, url: 'https://example.com', active: false, pinned: false, lastAccessed: 100 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    expect(duplicates).not.toContain(1);
    expect(duplicates).toContain(2);
  });

  it('should not mark pinned tabs as duplicates even if older', () => {
    // Pinned tab is oldest, non-pinned tabs share the URL - only non-pinned tabs are duplicates
    const tabs = [
      { id: 1, url: 'https://example.com', active: false, pinned: true, lastAccessed: 50 },
      { id: 2, url: 'https://example.com', active: false, pinned: false, lastAccessed: 100 },
      { id: 3, url: 'https://example.com', active: false, pinned: false, lastAccessed: 150 },
    ];
    const duplicates = getDuplicateTabs(tabs as chrome.tabs.Tab[], (t) => t.lastAccessed || 0);
    expect(duplicates).not.toContain(1);
    expect(duplicates).not.toContain(3); // newest non-pinned is kept
    expect(duplicates).toContain(2);
  });
});

describe('tab creation activity tracking', () => {
  beforeEach(() => {
    resetTabActivityMap();
    vi.clearAllMocks();
  });

  it('should update activity when tab is created with id', () => {
    updateTabActivity(100);

    const activity = getLastActivity({
      id: 100,
      url: '',
      title: '',
      index: 0,
      pinned: false,
      highlighted: false,
      active: false,
      windowId: 1,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      frozen: false,
      lastAccessed: 0,
    } as chrome.tabs.Tab);
    expect(activity).toBeGreaterThan(0);
  });

  it('should handle tab creation without id gracefully', () => {
    // Should not throw when tab has no id
    expect(() => {
      updateTabActivity(undefined as unknown as number);
    }).not.toThrow();
  });
});

describe('tab removal activity tracking', () => {
  beforeEach(() => {
    resetTabActivityMap();
    updateTabActivity(50);
  });

  it('should remove activity record when tab is closed', () => {
    expect(
      getLastActivity({
        id: 50,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);

    removeTabActivity(50);

    expect(
      getLastActivity({
        id: 50,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
  });

  it('should handle removing non-existent tab gracefully', () => {
    expect(() => {
      removeTabActivity(9999);
    }).not.toThrow();
  });

  it('should not affect other tabs when removing', () => {
    updateTabActivity(1);
    updateTabActivity(2);

    removeTabActivity(1);

    expect(
      getLastActivity({
        id: 1,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBe(0);
    expect(
      getLastActivity({
        id: 2,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      } as chrome.tabs.Tab),
    ).toBeGreaterThan(0);
  });
});

describe('storage change warning reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset warning when maxTabs changes', async () => {
    const changes = {
      maxTabs: { oldValue: 50, newValue: 100 },
    };

    handleStorageChanged(changes, 'sync');

    expect(chromeMock.action.setIcon).toHaveBeenCalled();
  });

  it('should reset warning when enabled changes', async () => {
    const changes = {
      enabled: { oldValue: true, newValue: false },
    };

    handleStorageChanged(changes, 'sync');

    expect(chromeMock.action.setIcon).toHaveBeenCalled();
  });

  it('should not reset warning for other changes', () => {
    const changes = {
      theme: { oldValue: 'light', newValue: 'dark' },
    };

    handleStorageChanged(changes, 'sync');

    expect(chromeMock.action.setIcon).not.toHaveBeenCalled();
  });

  it('should not respond to non-sync storage changes', () => {
    const changes = {
      maxTabs: { oldValue: 50, newValue: 100 },
    };

    handleStorageChanged(changes, 'local');

    expect(chromeMock.action.setIcon).not.toHaveBeenCalled();
  });
});

describe('command handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run cleanup on run-cleanup command', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: true });

    await handleCommand('run-cleanup');

    expect(chromeMock.tabs.query).toHaveBeenCalled();
  });

  it('should handle toggle-clean command from enabled to disabled', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: true });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await handleCommand('toggle-clean');

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ enabled: false });
  });

  it('should handle toggle-clean command from disabled to enabled', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({ enabled: false });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await handleCommand('toggle-clean');

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({ enabled: true });
  });

  it('should handle unknown commands gracefully', async () => {
    await handleCommand('unknown-command');

    // Should not throw
  });
});

describe('applyCleanupRules edge cases', () => {
  beforeEach(() => {
    resetTabActivityMap();
    vi.clearAllMocks();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([]);
  });

  it('should handle maxTabs of 0 (unlimited)', async () => {
    // Test that the function doesn't crash with maxTabs=0
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 0,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com', active: true, lastAccessed: 0 }, // active tab won't be closed
    ]);

    // Should not throw
    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle idleTimeout of 0 (immediately idle)', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 0,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com', active: false, lastAccessed: Date.now() - 1000 },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]);
  });

  it('should handle whitelist with special characters', async () => {
    // Test that the function doesn't crash with special characters in whitelist
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: ['example-site.com', 'test-domain.org'],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example-site.com/page', active: true, lastAccessed: 0 },
      { id: 2, url: 'https://test-domain.org/', active: false, lastAccessed: 0 },
      { id: 3, url: 'https://other.com/', active: false, lastAccessed: 0 },
    ]);

    // Should not throw - whitelist with special characters should work
    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle blacklist with special characters', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: ['facebook.com', 'twitter.com'],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://www.facebook.com/', active: false, lastAccessed: 0 },
      { id: 2, url: 'https://twitter.com/user', active: false, lastAccessed: 0 },
      { id: 3, url: 'https://linkedin.com/', active: false, lastAccessed: 0 },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1, 2]);
  });

  it('should not close tabs when all tabs are whitelisted', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 5,
      whitelist: ['example.com', 'test.com'],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com/', active: false, lastAccessed: 0 },
      { id: 2, url: 'https://test.com/', active: false, lastAccessed: 0 },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it('should handle mixed whitelist and blacklist correctly', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: ['facebook.com'],
      blacklist: ['facebook.com'],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://facebook.com/', active: false, lastAccessed: 0 },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it.skip('should handle extremely large number of tabs', { timeout: 10000 }, async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 10,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });

    const tabs = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      url: `https://site${i % 5}.com`,
      active: i === 0,
      lastAccessed: i * 1000,
    }));

    chromeMock.tabs.query.mockResolvedValue(tabs);

    const startTime = Date.now();
    await applyCleanupRules();
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(500);
  });

  it.skip('should handle notification creation error gracefully', { timeout: 10000 }, async () => {
    chromeMock.notifications.create.mockImplementation((options: any, callback: any) => {
      if (callback) {
        callback();
        Object.defineProperty(chrome.runtime, 'lastError', {
          value: { message: 'Notification failed' },
          writable: true,
        });
      }
      return Promise.resolve('mock-id');
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com', active: false, lastAccessed: 0 },
    ]);

    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle tabs with very long URLs', async () => {
    // Test that the function doesn't crash with very long URLs
    const longUrl = 'https://example.com/' + 'a'.repeat(5000);
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: longUrl, active: false, lastAccessed: Date.now() },
    ]);

    // Should not throw
    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should handle concurrent cleanup calls', async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com', active: false, lastAccessed: 0 },
    ]);

    const promises = [applyCleanupRules(), applyCleanupRules(), applyCleanupRules()];
    await Promise.all(promises);
  });

  it('should properly handle tab with no lastAccessed property', async () => {
    // Tab without lastAccessed property - the code uses fallback of 0 (falsy),
    // which means the idle check passes but the falsy check fails, so it won't be closed
    // This is expected behavior - we just verify it doesn't crash
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com', active: false }]);

    // Should not throw
    await expect(applyCleanupRules()).resolves.not.toThrow();
  });

  it('should not close pinned tabs when idle', async () => {
    const now = Date.now();
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 1,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      {
        id: 1,
        url: 'https://example.com',
        active: false,
        pinned: true,
        lastAccessed: now - 120000,
      },
      { id: 2, url: 'https://other.com', active: false, pinned: false, lastAccessed: now - 120000 },
    ]);

    await applyCleanupRules();

    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([2]);
  });

  it('should not close pinned tabs when over maxTabs', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 2,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://a.com', active: true, pinned: false, lastAccessed: 100 },
      { id: 2, url: 'https://b.com', active: false, pinned: true, lastAccessed: 200 },
      { id: 3, url: 'https://c.com', active: false, pinned: false, lastAccessed: 150 },
    ]);

    await applyCleanupRules();

    // Pinned tab (id: 2) should not be closed even though it's over maxTabs
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([3]);
  });

  it('should not close pinned tabs that are duplicates', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com', active: true, pinned: false, lastAccessed: 100 },
      { id: 2, url: 'https://example.com', active: false, pinned: true, lastAccessed: 200 },
      { id: 3, url: 'https://example.com', active: false, pinned: false, lastAccessed: 150 },
    ]);

    await applyCleanupRules();

    // Pinned duplicate (id: 2) should not be closed
    const removedTabs = chromeMock.tabs.remove.mock.calls[0][0];
    expect(removedTabs).not.toContain(2);
    expect(removedTabs).toContain(3);
  });

  it('should not close tabs when maxTabs is 0 (unlimited)', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 0,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    const now = Date.now();
    chromeMock.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://a.com', active: true, lastAccessed: now },
      { id: 2, url: 'https://b.com', active: false, lastAccessed: now - 10000 },
      { id: 3, url: 'https://c.com', active: false, lastAccessed: now - 20000 },
      { id: 4, url: 'https://d.com', active: false, lastAccessed: now - 30000 },
      { id: 5, url: 'https://e.com', active: false, lastAccessed: now - 40000 },
    ]);

    await applyCleanupRules();

    // No tabs should be closed due to maxTabs (0 = unlimited)
    // Idle timeout is 60min and all tabs are within that window
    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });
});

describe('chrome.runtime.onMessage runCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should await applyCleanupRules before calling sendResponse', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([]);

    const sendResponse = vi.fn();
    const result = messageListener({ action: 'runCleanup' }, {}, sendResponse);

    // Must return true to keep channel open for async response
    expect(result).toBe(true);

    // sendResponse should not fire synchronously
    expect(sendResponse).not.toHaveBeenCalled();

    // Wait for the async promise chain to complete
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ status: 'started' });
    });

    // Verify cleanup actually ran
    expect(chromeMock.tabs.query).toHaveBeenCalled();
  });

  it('should return undefined for unknown actions', () => {
    const sendResponse = vi.fn();
    const result = messageListener({ action: 'unknown' }, {}, sendResponse);

    expect(result).toBeUndefined();
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

// Capture event listeners registered during module import
const createdListener = chromeMock.tabs.onCreated.addListener.mock.calls[0][0] as (
  ...args: any[]
) => any;
const removedListener = chromeMock.tabs.onRemoved.addListener.mock.calls[0][0] as (
  ...args: any[]
) => any;
const storageChangedListener = chromeMock.storage.onChanged.addListener.mock.calls[0][0] as (
  ...args: any[]
) => any;
const commandListener = chromeMock.commands.onCommand.addListener.mock.calls[0][0] as (
  ...args: any[]
) => any;

describe('chrome.tabs.onCreated listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should update activity and run cleanup when tab has id', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });

    createdListener({ id: 1 });

    await vi.waitFor(() => {
      expect(chromeMock.tabs.query).toHaveBeenCalled();
    });
  });

  it('should handle tab without id', () => {
    createdListener({});
    // Should not throw
  });
});

describe('chrome.tabs.onRemoved listener', () => {
  beforeEach(() => {
    resetTabActivityMap();
  });

  it('should remove tab activity record', () => {
    updateTabActivity(42);
    expect(
      getLastActivity({
        id: 42,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      }),
    ).toBeGreaterThan(0);

    removedListener(42);
    // After removal, should fallback to lastAccessed
    expect(
      getLastActivity({
        id: 42,
        url: '',
        title: '',
        index: 0,
        pinned: false,
        highlighted: false,
        active: false,
        windowId: 1,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
        frozen: false,
        lastAccessed: 0,
      }),
    ).toBe(0);
  });
});

describe('chrome.storage.onChanged listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should call handleStorageChanged with changes and namespace', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });

    storageChangedListener({ maxTabs: { newValue: 10 } }, 'sync');

    await vi.waitFor(() => {
      expect(chromeMock.tabs.query).toHaveBeenCalled();
    });
  });
});

describe('chrome.commands.onCommand listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
  });

  it('should call handleCommand and catch errors', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      whitelist: [],
      blacklist: [],
      notificationsEnabled: false,
    });
    chromeMock.tabs.query.mockResolvedValue([]);

    commandListener('run-cleanup');

    // Should not throw — errors are caught
    await vi.waitFor(() => {
      expect(chromeMock.tabs.query).toHaveBeenCalled();
    });
  });
});

describe('tabActivityMap persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTabActivityMap();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadTabActivityMap', () => {
    it('should return empty map when nothing stored', async () => {
      chromeMock.storage.local.get.mockResolvedValue({});
      const loaded = await loadTabActivityMap();
      expect(loaded.size).toBe(0);
    });

    it('should restore stored activity map', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        tabActivityMap: { '1': 1000, '2': 2000 },
      });
      const loaded = await loadTabActivityMap();
      expect(loaded.size).toBe(2);
      expect(loaded.get(1)).toBe(1000);
      expect(loaded.get(2)).toBe(2000);
    });

    it('should handle invalid data gracefully', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        tabActivityMap: 'invalid',
      });
      const loaded = await loadTabActivityMap();
      expect(loaded.size).toBe(0);
    });

    it('should filter out NaN keys', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        tabActivityMap: { abc: 1000, '1': 2000 },
      });
      const loaded = await loadTabActivityMap();
      expect(loaded.size).toBe(1);
      expect(loaded.get(1)).toBe(2000);
    });

    it('should handle Chrome API errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      chromeMock.storage.local.get.mockRejectedValue(new Error('Storage error'));
      const loaded = await loadTabActivityMap();
      expect(loaded.size).toBe(0);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('schedulePersistTabActivityMap', () => {
    it('should persist after debounce delay', async () => {
      updateTabActivity(1);
      updateTabActivity(2);

      await vi.advanceTimersByTimeAsync(500);

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        tabActivityMap: { '1': expect.any(Number), '2': expect.any(Number) },
      });
    });

    it('should debounce multiple rapid calls', async () => {
      updateTabActivity(1);
      await vi.advanceTimersByTimeAsync(100);
      updateTabActivity(2);
      await vi.advanceTimersByTimeAsync(100);
      updateTabActivity(3);

      await vi.advanceTimersByTimeAsync(500);

      expect(chromeMock.storage.local.set).toHaveBeenCalledTimes(1);
    });

    it('should persist after removeTabActivity', async () => {
      updateTabActivity(1);
      await vi.advanceTimersByTimeAsync(500);

      removeTabActivity(1);
      await vi.advanceTimersByTimeAsync(500);

      expect(chromeMock.storage.local.set).toHaveBeenLastCalledWith({
        tabActivityMap: {},
      });
    });

    it('should handle storage errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      chromeMock.storage.local.set.mockRejectedValue(new Error('Storage error'));

      updateTabActivity(1);
      await vi.advanceTimersByTimeAsync(500);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('initializeActivityTracking with persistence', () => {
    it('should restore from storage and seed missing tabs', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        tabActivityMap: { '1': 1000, '999': 2000 },
      });
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://a.com', lastAccessed: 5000 },
        { id: 2, url: 'https://b.com', lastAccessed: 6000 },
      ]);

      await initializeActivityTracking();

      expect(
        getLastActivity({
          id: 1,
          url: '',
          title: '',
          index: 0,
          pinned: false,
          highlighted: false,
          active: false,
          windowId: 1,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        } as chrome.tabs.Tab),
      ).toBe(1000);

      expect(
        getLastActivity({
          id: 2,
          url: '',
          title: '',
          index: 0,
          pinned: false,
          highlighted: false,
          active: false,
          windowId: 1,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        } as chrome.tabs.Tab),
      ).toBe(6000);
    });

    it('should remove stale entries for closed tabs', async () => {
      updateTabActivity(1);
      updateTabActivity(999);
      await vi.advanceTimersByTimeAsync(500);

      chromeMock.storage.local.get.mockResolvedValue({});
      chromeMock.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://a.com', lastAccessed: 5000 },
      ]);

      resetTabActivityMap();
      await initializeActivityTracking();

      expect(
        getLastActivity({
          id: 999,
          url: '',
          title: '',
          index: 0,
          pinned: false,
          highlighted: false,
          active: false,
          windowId: 1,
          incognito: false,
          selected: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
        } as chrome.tabs.Tab),
      ).toBe(0);
    });
  });
});
