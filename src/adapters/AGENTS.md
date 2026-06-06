# src/adapters/ — Port Implementations

**OVERVIEW:** Real and fake implementations of hexagonal port interfaces.

## Structure

| Dir | Purpose |
|-----|---------|
| `chrome/` | Real Chrome API wrappers (6 files) |
| `memory/` | In-memory test doubles (5 files, no events adapter) |

## chrome/

| File | Implements | Chrome API Used |
|------|-----------|-----------------|
| `tabs.adapter.ts` | `TabsPort` | `chrome.tabs.*` |
| `storage.adapter.ts` | `StoragePort` | `chrome.storage.sync.*` |
| `notifications.adapter.ts` | `NotificationsPort` | `chrome.notifications.*` |
| `actions.adapter.ts` | `ActionsPort` | `chrome.action.*` |
| `events.adapter.ts` | `RuntimePort`, `CommandsPort`, `AlarmsPort` | `chrome.runtime.*`, `chrome.commands.*`, `chrome.alarms.*` |
| `index.ts` | Barrel re-export | — |

## memory/

| File | Implements | Behavior |
|------|-----------|----------|
| `storage.adapter.ts` | `StoragePort` | In-memory Map, triggers `onChanged` callbacks |
| `tabs.adapter.ts` | `TabsPort` | In-memory tab array, simulates add/remove/query |
| `notifications.adapter.ts` | `NotificationsPort` | Noop — logs calls, doesn't show notifications |
| `actions.adapter.ts` | `ActionsPort` | Noop — logs calls |
| `index.ts` | Barrel re-export | — |

## Conventions

- Each adapter class is constructed via DI in `src/platform/index.ts`
- `events.adapter.ts` exports 3 separate classes (one per sub-port interface)
- Memory adapters use `createTestPlatform()` in `src/platform/index.ts` for isolated integration tests

## Gotchas

- **No memory events adapter** — test platform in `src/platform/` inlines mock event handlers directly
- Chrome adapters call `console.warn` on `chrome.runtime.lastError` rather than throwing
