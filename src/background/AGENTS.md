# src/background/ — Service Worker (Cleanup Engine)

**OVERVIEW:** Chrome extension service worker — tab cleanup rules, activity tracking, and event wiring. 374 lines.

## Structure

| File | Purpose |
|------|---------|
| `index.ts` | Cleanup engine + Chrome event listeners |
| `index.test.ts` | Integration tests using `createTestPlatform()` |
| `__mocks__/` | Chrome API mocks for testing |

## Key Functions

| Function | Role |
|----------|------|
| `applyCleanupRules()` | Main cleanup orchestrator — runs all 6 rules in order |
| `getDuplicateTabs(tabs)` | Finds duplicate URLs, keeps most recent/active |
| `updateTabActivity(tabId)` | Records tab interaction timestamp |
| `getLastActivity(tab)` | Gets last activity time from map or `tab.lastAccessed` |
| `removeTabActivity(tabId)` | Cleans up map on tab close |
| `initializeActivityTracking()` | Seeds activity map for all existing tabs on startup |
| `setWarningIcon(enable)` | Toggles yellow icon when near tab limit |
| `handleStorageChanged(changes, ns)` | Resets warning on settings change |
| `handleCommand(command)` | Handles keyboard shortcut commands |

## Cleanup Rules (executed in order)

1. Skip whitelisted tab groups
2. Skip whitelisted domains
3. Close blacklisted domains (if inactive)
4. Close idle tabs (beyond configured timeout)
5. Close duplicate tabs (keep most recent)
6. Close oldest inactive tabs if over max limit

## Event Listeners

| Event | Handler |
|-------|---------|
| `alarms.onAlarm` | `applyCleanupRules()` (every 1 min) |
| `runtime.onInstalled` | `applyCleanupRules()` |
| `runtime.onStartup` | `applyCleanupRules()` |
| `runtime.onMessage` | Manual cleanup trigger (`action: 'runCleanup'`) |
| `tabs.onActivated` | `updateTabActivity()` |
| `tabs.onUpdated` | `updateTabActivity()` on nav/load |
| `tabs.onCreated` | `updateTabActivity()` + `applyCleanupRules()` |
| `tabs.onRemoved` | `removeTabActivity()` |
| `storage.onChanged` | `handleStorageChanged()` |
| `commands.onCommand` | `handleCommand()` |

## Anti-Patterns

- **This module uses `chrome.*` API directly** — legacy design. New integrations should go through port/adapter pattern.
