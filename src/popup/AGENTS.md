# src/popup/ — Browser Action Popup

**OVERVIEW:** Popup UI shown when user clicks the extension toolbar icon.

## Files

| File | Purpose |
|------|---------|
| `popup.ts` | Popup logic — settings display, manual cleanup, QR code |
| `popup.html` | Popup markup |
| `popup.css` | Popup styles |
| `popup.test.ts` | Tests |
| `__mocks__/` | Chrome API mocks |

## Key Features

- View and toggle current settings (enabled, idle timeout, max tabs)
- Trigger manual cleanup (`runCleanup` message to background)
- Generate QR code for current page URL using `qrcode` library
- Shows real-time settings state from `chrome.storage.sync`

## Dependencies

- `qrcode` npm package — client-side QR generation from canvas API
- `chrome.storage.sync` — reads settings directly (not port/adapter)
- `chrome.tabs.query` — gets current active tab URL

## Gotchas

- Popup reads `chrome.storage.sync` directly — does NOT use `StoragePort` adapter
- QR code rendering uses HTML Canvas API
