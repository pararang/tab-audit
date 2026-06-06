# src/core/ — Port Interfaces & Business Logic Layer

**OVERVIEW:** Pure TypeScript interface contracts (`ports/`) plus barrel exports. Zero Chrome API dependencies.

## Structure

| Path | Contents |
|------|----------|
| `ports/` | 5 port interfaces: `TabsPort`, `StoragePort`, `NotificationsPort`, `ActionsPort`, `EventsPort` (includes `RuntimePort`, `CommandsPort`, `AlarmsPort`) |
| `services/` | Reserved for future business logic services — currently empty |
| `index.ts` | Barrel re-export of all port interfaces |

## Port Interfaces

| Port | Methods |
|------|---------|
| `TabsPort` | `query()`, `remove()`, `onActivated()`, `onUpdated()`, `onCreated()`, `onRemoved()` |
| `StoragePort` | `getSettings()`, `saveSettings()`, `onChanged()` |
| `NotificationsPort` | `create()` |
| `ActionsPort` | `setIcon()` |
| `EventsPort` | `RuntimePort`: `getURL()`, `onInstalled()`, `onStartup()`, `onMessage()` |
| | `CommandsPort`: `onCommand()` |
| | `AlarmsPort`: `create()`, `onAlarm()` |

Also exports value types: `TabFilter`, `Tab`, `NotificationOptions`, `IconPath`.

## Rules

- **NO adapter imports** — ports know nothing about Chrome or in-memory implementations
- **NO business logic** — signatures only, implementations live in adapters
- **All methods return `Promise`** — Chrome API async contract
- **Only dependency:** `Settings` type from `src/shared/settings` (via `storage.port.ts`)

## Where to Look

- **Building a new integration** (Firefox, Electron) → implement ports in new adapter dir, wire in platform
- **Adding a new port** → create `your-domain.port.ts` here, add barrel export in `index.ts`
