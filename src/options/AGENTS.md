# src/options/ — Extension Options Page

**OVERVIEW:** Full settings management page for configuring tab cleanup rules.

## Files

| File | Purpose |
|------|---------|
| `options.ts` | Settings form — read/write all configurable fields |
| `options.html` | Options page markup |
| `options.css` | Options page styles |
| `options.test.ts` | Tests |
| `__mocks__/` | Chrome API mocks |

## Settings

Form fields mapped to `Settings` interface from `src/shared/settings.ts`:

| Field | Type | Default |
|-------|------|---------|
| Enabled | toggle | `false` |
| Idle Timeout | number (minutes) | `30` |
| Max Tabs | number (0 = unlimited) | `50` |
| Whitelist | textarea (one per line) | `[]` |
| Blacklist | textarea (one per line) | `[]` |
| Whitelisted Tab Groups | textarea (one per line) | `[]` |
| Notifications | toggle | `true` |

## Gotchas

- Reads/writes `chrome.storage.sync` directly — NOT port/adapter pattern
- Domain lists stored as JSON arrays, UI renders as newline-separated text
- Triggers `applyCleanupRules` indirectly via `storage.onChanged` listener in background
