# src/shared/ — Cross-Cutting Types & Utilities

**OVERVIEW:** Shared models, domain logic, and utilities consumed by all modules.

## Files

| File | Exports | Used By |
|------|---------|---------|
| `settings.ts` | `Settings` interface, `DEFAULT_SETTINGS`, `getSettings()`, `saveSettings()` | Every module |
| `domain.ts` | `getDomain(url)`, `domainMatches(domain, pattern)` | Cleanup rules |
| `utils.ts` | General utility functions | Various |
| `__mocks__/chrome.ts` | Mock `chrome.*` API surface for cross-module tests | Tests across all modules |

## Conventions

- Sync/Promise split: pure functions sync, Chrome API wrappers async
- `domain.ts` — pure string manipulation, synchronous
- `chrome.storage.sync` in `settings.ts` is legacy — prefer `StoragePort` for new code

## Gotchas

- `getSettings()` falls back to `DEFAULT_SETTINGS` on error — test error paths
- Modifying `Settings` interface breaks ALL consumers — update adapters, background, popup, options in same PR
