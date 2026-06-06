# Tab Auditor

[![CI](https://github.com/pararang/tab-audit/workflows/CI/badge.svg)](https://github.com/pararang/tab-audit/actions)
[![codecov](https://codecov.io/gh/pararang/tab-audit/branch/main/graph/badge.svg)](https://codecov.io/gh/pararang/tab-audit)

> [!WARNING]
> This extension was developed with assistance from artificial intelligence tools. DYOR.

A Chrome extension that automatically audits and closes browser tabs to free memory. Keep your browser organized and save memory by closing inactive, duplicate, or excess tabs based on customizable rules.

## Features

- **Idle Tab Cleanup** - Automatically close tabs that haven't been accessed for a specified time
- **Duplicate Tab Detection** - Identify and close duplicate tabs (keeps the most recently accessed)
- **Domain Whitelist/Blacklist** - Always protect important domains or automatically close specific domains
- **Tab Group Whitelist** - Protect entire tab groups by name from cleanup
- **Max Tab Limit** - Enforce a maximum number of tabs by closing the oldest inactive ones
- **Activity Tracking** - Robust tab activity detection that resets the idle timer when you interact with tabs
- **Notifications** - Get notified when tabs are automatically closed, or when approaching the tab limit
- **Warning Icon** - Extension icon turns yellow when nearing the configured tab limit
- **Theme Support** - Light, dark, or system-following theme
- **Manual Cleanup** - Trigger cleanup on demand from the popup
- **Tab Stats** - View living tabs, cleaned count, and top domain in the popup
- **Settings Backup/Restore** - Export and import settings as JSON from the options page
- **QR Code Generation** - Generate QR codes for the current page to easily share or open on other devices
- **Keyboard Shortcuts** - Run cleanup or toggle auto-clean with configurable shortcuts

## Installation

### From GitHub Releases (Recommended)

1. Download the latest `tab-audit.zip` from [GitHub Releases](https://github.com/pararang/tab-audit/releases).
2. Extract the ZIP file to a folder on your computer.
3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the folder where you extracted the ZIP.

### From Source

1. Clone the repository:

   ```bash
   git clone https://github.com/pararang/tab-audit.git
   cd tab-audit
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the extension:

   ```bash
   pnpm build:prod
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the `dist/` folder inside the project.

### From Chrome Web Store

Coming soon!

## Configuration

The extension starts **disabled by default** to prevent unexpected tab closures during auditing. Configure the following settings:

| Setting | Description | Default |
|---|---|---|
| **Enabled** | Whether automatic auditing is active | `false` |
| **Idle Timeout** | Minutes before a tab is considered idle | `30` |
| **Max Tabs** | Maximum number of tabs allowed (`0` = unlimited) | `50` |
| **Whitelist** | Domains to always protect from auditing | `[]` |
| **Blacklist** | Domains to automatically close (unless active) | `[]` |
| **Whitelisted Tab Groups** | Tab group names to protect from cleanup | `[]` |
| **Notifications** | Show notifications when tabs are closed | `true` |
| **Theme** | UI theme: `light`, `dark`, or `system` | `system` |

### Cleanup Rules

Tabs are evaluated in order: tab group whitelist → domain whitelist → blacklist → idle timeout → duplicate detection → max tab limit. See `AGENTS.md` for details.

### Domain Matching

Exact and subdomain matching supported; partial match not supported. See `AGENTS.md` for technical rules.

## Development

See `AGENTS.md` for build commands, testing, linting, project structure, release process, and contributing workflow.

## Debugging

1. Open `chrome://extensions/`
2. Find "Tab Auditor"
3. Click **Service worker** to open the background script console
4. Check for errors and logs

## License

MIT

## Privacy

Tab Auditor:

- Runs entirely locally in your browser
- Does not collect or transmit any data to external servers
- Uses Chrome's local storage for settings only
- Does not access or analyze tab contents
- Minimal permissions: `tabs`, `storage`, `notifications`, `alarms`, `activeTab`
