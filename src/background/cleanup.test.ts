import { describe, it, expect } from 'vitest';
import { computeCleanup } from './cleanup';
import type { CleanupInput, CleanupResult } from './cleanup';
import type { Settings } from '../shared/settings';

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    enabled: true,
    idleTimeout: 30,
    maxTabs: 50,
    whitelist: [],
    blacklist: [],
    whitelistedTabGroups: [],
    notificationsEnabled: true,
    theme: 'system',
    ...overrides,
  };
}

function tab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    pinned: false,
    highlighted: false,
    active: false,
    windowId: 1,
    incognito: false,
    url: 'https://example.com/page',
    title: 'Example',
    lastAccessed: Date.now(),
    groupId: -1,
    frozen: false,
    selected: false,
    discarded: false,
    autoDiscardable: false,
    ...overrides,
  };
}

function run(input: Partial<CleanupInput> = {}): CleanupResult {
  const now = Date.now();
  return computeCleanup({
    settings: makeSettings(),
    tabs: [],
    whitelistedGroupIds: new Set(),
    now,
    getLastActivity: (t) => t.lastAccessed || 0,
    ...input,
  });
}

// ---------------------------------------------------------------------------
// Empty / no-op
// ---------------------------------------------------------------------------
describe('computeCleanup — empty / no-op', () => {
  it('returns empty result for empty tabs', () => {
    const r = run({ tabs: [] });
    expect(r.tabIdsToClose).toEqual([]);
    expect(r.shouldWarn).toBe(false);
  });

  it('returns empty when all tabs are active', () => {
    const r = run({ tabs: [tab({ active: true })] });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('returns empty when all tabs are pinned', () => {
    const r = run({ tabs: [tab({ pinned: true })] });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('skips tabs without an id', () => {
    const r = run({ tabs: [tab({ id: undefined })] });
    expect(r.tabIdsToClose).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rule 1 — Tab group whitelist
// ---------------------------------------------------------------------------
describe('Rule 1 — Tab group whitelist', () => {
  it('skips tabs in whitelisted groups', () => {
    const t = tab({ groupId: 5 });
    const r = run({
      tabs: [t],
      whitelistedGroupIds: new Set([5]),
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('does not skip tabs in non-whitelisted groups', () => {
    const t = tab({ groupId: 5 });
    const r = run({
      tabs: [t],
      whitelistedGroupIds: new Set([99]),
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });

  it('handles tabs without groupId (groupId === -1)', () => {
    const t = tab({ groupId: -1 });
    const r = run({
      tabs: [t],
      whitelistedGroupIds: new Set([5]),
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Rule 2 — Domain whitelist
// ---------------------------------------------------------------------------
describe('Rule 2 — Domain whitelist', () => {
  it('skips tabs on whitelisted domains', () => {
    const r = run({
      tabs: [tab()],
      settings: makeSettings({ whitelist: ['example.com'], blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('whitelist does not affect non-matching domains', () => {
    const r = run({
      tabs: [tab({ url: 'https://other.com/page' })],
      settings: makeSettings({ whitelist: ['example.com'], blacklist: ['other.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Rule 3 — Blacklist
// ---------------------------------------------------------------------------
describe('Rule 3 — Blacklist', () => {
  it('closes tabs on blacklisted domains', () => {
    const r = run({
      tabs: [tab()],
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });

  it('does not close tabs not on blacklist', () => {
    const r = run({
      tabs: [tab()],
      settings: makeSettings({ blacklist: ['other.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('blacklist matches subdomains', () => {
    const r = run({
      tabs: [tab({ url: 'https://sub.example.com/page' })],
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Rule 4 — Idle timeout
// ---------------------------------------------------------------------------
describe('Rule 4 — Idle timeout', () => {
  it('closes tabs idle beyond the timeout', () => {
    const r = run({
      tabs: [tab({ lastAccessed: Date.now() - 60 * 60 * 1000 })],
      settings: makeSettings({ idleTimeout: 1 }),
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });

  it('does not close recently active tabs', () => {
    const r = run({
      tabs: [tab({ lastAccessed: Date.now() })],
      settings: makeSettings({ idleTimeout: 30 }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('uses custom getLastActivity when available', () => {
    const customActivity = new Map<number, number>([[1, Date.now() - 60 * 60 * 1000]]);
    const r = run({
      tabs: [tab({ lastAccessed: Date.now() })],
      settings: makeSettings({ idleTimeout: 1 }),
      getLastActivity: (t) => customActivity.get(t.id ?? -1) ?? t.lastAccessed ?? 0,
    });
    // Custom activity says idle despite fresh lastAccessed
    expect(r.tabIdsToClose).toEqual([1]);
  });

  it('idleTimeout of 0 makes all tabs idle', () => {
    const now = Date.now();
    const r = run({
      tabs: [tab({ lastAccessed: now - 1000 })],
      settings: makeSettings({ idleTimeout: 0 }),
      now,
    });
    expect(r.tabIdsToClose).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Rule 5 — Duplicate tabs
// ---------------------------------------------------------------------------
describe('Rule 5 — Duplicate tabs', () => {
  it('closes duplicate URLs keeping the most recently accessed', () => {
    const oldTab = tab({ id: 1, lastAccessed: Date.now() - 10_000, url: 'https://example.com' });
    const recentTab = tab({ id: 2, lastAccessed: Date.now(), url: 'https://example.com' });
    const r = run({ tabs: [oldTab, recentTab] });
    expect(r.tabIdsToClose).toEqual([1]);
  });

  it('keeps active tab over duplicates', () => {
    const activeTab = tab({
      id: 1,
      active: true,
      lastAccessed: Date.now() - 10_000,
      url: 'https://example.com',
    });
    const inactiveTab = tab({ id: 2, lastAccessed: Date.now(), url: 'https://example.com' });
    const r = run({ tabs: [activeTab, inactiveTab] });
    expect(r.tabIdsToClose).toEqual([2]);
  });

  it('does not close pinned duplicates', () => {
    const now = Date.now();
    const pinnedTab = tab({ id: 1, pinned: true, url: 'https://example.com', lastAccessed: now });
    const otherTab = tab({ id: 2, url: 'https://example.com', lastAccessed: now - 100_000 });
    const r = run({ tabs: [pinnedTab, otherTab], now });
    expect(r.tabIdsToClose).toEqual([2]);
  });

  it('handles tabs without URL', () => {
    const t1 = tab({ id: 1, url: undefined });
    const t2 = tab({ id: 2, url: undefined });
    const r = run({ tabs: [t1, t2] });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('uses custom getLastActivity for duplicate sorting', () => {
    // Tab 1 has fresh lastAccessed but custom activity says old
    // Tab 2 has old lastAccessed but custom activity says fresh
    const customActivity = new Map<number, number>([
      [1, Date.now() - 100_000], // custom: tab 1 is old
      [2, Date.now()], // custom: tab 2 is recent
    ]);
    const t1 = tab({ id: 1, lastAccessed: Date.now(), url: 'https://example.com' });
    const t2 = tab({ id: 2, lastAccessed: Date.now() - 100_000, url: 'https://example.com' });
    const r = run({
      tabs: [t1, t2],
      getLastActivity: (t) => customActivity.get(t.id ?? -1) ?? t.lastAccessed ?? 0,
    });
    // Without custom activity, tab 2 would be closed (older lastAccessed).
    // With custom activity, tab 1 should be closed (older custom activity).
    expect(r.tabIdsToClose).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Rule 6 — Max tabs
// ---------------------------------------------------------------------------
describe('Rule 6 — Max tabs', () => {
  function makeTabs(n: number, startId = 1): chrome.tabs.Tab[] {
    return Array.from({ length: n }, (_, i) =>
      tab({
        id: startId + i,
        lastAccessed: Date.now() - (n - i) * 10_000,
        url: `https://site${i}.com`,
      }),
    );
  }

  it('closes oldest inactive tabs when over maxTabs', () => {
    const tabs = makeTabs(5);
    const r = run({ tabs, settings: makeSettings({ maxTabs: 3 }) });
    // 5 tabs, maxTabs=3 → close 2 oldest
    expect(r.tabIdsToClose).toHaveLength(2);
    expect(r.tabIdsToClose).toContain(1);
    expect(r.tabIdsToClose).toContain(2);
  });

  it('maxTabs=0 is unlimited, closes nothing extra', () => {
    const tabs = makeTabs(10);
    const r = run({ tabs, settings: makeSettings({ maxTabs: 0 }) });
    // No tabs from maxTabs rule, only from other rules
    expect(r.tabIdsToClose).toHaveLength(0);
  });

  it('respects whitelist during max-tab eviction', () => {
    const t1 = tab({ id: 1, lastAccessed: Date.now() - 100_000, url: 'https://whitelisted.com' });
    const t2 = tab({ id: 2, lastAccessed: Date.now() - 50_000, url: 'https://other.com' });
    const r = run({
      tabs: [t1, t2],
      settings: makeSettings({ maxTabs: 1, whitelist: ['whitelisted.com'] }),
    });
    // Only t2 should be closed (t1 is whitelisted)
    expect(r.tabIdsToClose).toEqual([2]);
  });

  it('does not close active tabs during eviction', () => {
    const tabs = [
      tab({ id: 1, active: true, lastAccessed: Date.now() - 100_000 }),
      tab({ id: 2, lastAccessed: Date.now() - 50_000 }),
    ];
    const r = run({ tabs, settings: makeSettings({ maxTabs: 1 }) });
    expect(r.tabIdsToClose).toEqual([2]);
  });
});

// ---------------------------------------------------------------------------
// Rule interactions
// ---------------------------------------------------------------------------
describe('Rule interactions', () => {
  it('whitelist beats blacklist when both match', () => {
    const r = run({
      tabs: [tab()],
      settings: makeSettings({
        whitelist: ['example.com'],
        blacklist: ['example.com'],
      }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('group whitelist beats blacklist', () => {
    const r = run({
      tabs: [tab({ groupId: 5 })],
      whitelistedGroupIds: new Set([5]),
      settings: makeSettings({ blacklist: ['example.com'] }),
    });
    expect(r.tabIdsToClose).toEqual([]);
  });

  it('duplicate rule skips whitelisted tabs', () => {
    const t1 = tab({ id: 1, url: 'https://example.com', groupId: 5 });
    const t2 = tab({ id: 2, url: 'https://example.com', groupId: 5 });
    const r = run({
      tabs: [t1, t2],
      whitelistedGroupIds: new Set([5]),
    });
    // Neither should be closed — both in whitelisted group
    expect(r.tabIdsToClose).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Warning threshold
// ---------------------------------------------------------------------------
describe('Warning threshold', () => {
  it('warns when tabs >= maxTabs - 2', () => {
    const tabs = Array.from({ length: 8 }, (_, i) =>
      tab({ id: i + 1, url: `https://site${i}.com` }),
    );
    const r = run({ tabs, settings: makeSettings({ maxTabs: 10 }) });
    // 8 >= 10-2 = 8 → should warn
    expect(r.shouldWarn).toBe(true);
  });

  it('does not warn when below threshold', () => {
    const tabs = Array.from({ length: 5 }, (_, i) =>
      tab({ id: i + 1, url: `https://site${i}.com` }),
    );
    const r = run({ tabs, settings: makeSettings({ maxTabs: 10 }) });
    expect(r.shouldWarn).toBe(false);
  });

  it('does not warn for maxTabs too small to have threshold', () => {
    const r = run({
      tabs: [tab(), tab()],
      settings: makeSettings({ maxTabs: 1 }),
    });
    // maxTabs - 2 = -1, warningThreshold > 0 is false
    expect(r.shouldWarn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
  it('handles tabs with undefined url', () => {
    const r = run({ tabs: [tab({ url: undefined })] });
    expect(r.tabIdsToClose).toEqual([]); // No domain to match
  });

  it('handles tabs with undefined lastAccessed', () => {
    const r = run({
      tabs: [tab({ lastAccessed: undefined })],
      settings: makeSettings({ idleTimeout: 1 }),
    });
    expect(r.tabIdsToClose).toEqual([]); // getLastActivity returns 0 → not idle
  });

  it('correctly reports tabCount', () => {
    const r = run({ tabs: [tab(), tab()] });
    expect(r.tabCount).toBe(2);
  });
});
