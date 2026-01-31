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
- **Max Tab Limit** - Enforce a maximum number of tabs by closing the oldest inactive ones
- **Activity Tracking** - Robust tab activity detection that resets the idle timer when you interact with tabs
- **Notifications** - Get notified when tabs are automatically closed
- **Manual Cleanup** - Trigger cleanup on demand from the popup

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
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build:prod
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked** and select the `dist/` folder inside the project.

### From Chrome Web Store

Coming soon!

## Configuration

The extension starts **disabled by default** to prevent unexpected tab closures during auditing. Configure the following settings:

| Setting           | Description                                    | Default |
| ----------------- | ---------------------------------------------- | ------- |
| **Enabled**       | Whether automatic auditing is active           | `false` |
| **Idle Timeout**  | Minutes before a tab is considered idle        | `30`    |
| **Max Tabs**      | Maximum number of tabs allowed (0 = unlimited) | `50`    |
| **Whitelist**     | Domains to always protect from auditing        | `[]`    |
| **Blacklist**     | Domains to automatically close (unless active) | `[]`    |
| **Notifications** | Show notifications when tabs are closed        | `true`  |

### Cleanup Rules (in order)

1. **Whitelist check** - Skip any tab on the whitelist
2. **Blacklist check** - Close any tab on the blacklist (unless active)
3. **Idle timeout** - Close tabs idle beyond the configured timeout
4. **Duplicate tabs** - Close duplicate tabs (keeps the most recently accessed)
5. **Max tabs** - Close oldest inactive tabs if over the limit

### Domain Matching

Domain entries in the whitelist and blacklist support:

- **Exact match**: `google.com` matches `google.com`
- **Subdomain match**: `google.com` matches `mail.google.com`, `docs.google.com`, etc.
- **Partial match not supported**: `google.com` does NOT match `fakegoogle.com`

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build Commands

```bash
# Development build
npm run build

# Production build (minified)
npm run build:prod

# Watch mode (rebuilds on file changes)
npm run dev

# Package for Chrome Web Store
npm run package
```

### Release Process

Automated releases are triggered by pushing tags:

```bash
# Create and push a new version tag
git tag v1.0.0
git push origin v1.0.0
```

This will:
- Run tests and build the extension
- Create `tab-audit.zip` package
- Generate GitHub release with downloadable files
- Include release notes automatically

### Lint & Format

```bash
# Lint code
npm run lint

# Lint and auto-fix
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format
```

### Testing & Coverage

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

**Coverage Requirement: Minimum 85%**

- All new code must be tested
- Coverage must not decrease from baseline
- Mock files (`__mocks__`) are excluded from coverage
- Run `npm run test:coverage` before committing

### Project Structure

```
src/
├── background/       # Service worker (main logic)
│   └── index.ts      # Tab cleanup rules, activity tracking
├── popup/            # Browser action popup UI
├── options/          # Extension options page
├── shared/           # Shared code
│   ├── settings.ts   # Settings interface and storage
│   ├── types.ts      # TypeScript interfaces
│   ├── constants.ts  # Shared constants
│   └── utils.ts      # Utility functions
└── manifest.json     # Chrome extension manifest (V3)
```

### Debugging

1. Open `chrome://extensions/`
2. Find "Tab Auto Clean"
3. Click "Service worker" to open the background script console
4. Check for errors and logs

## Contributing

This project uses **bd** (bead) for task and issue tracking. All work should be tracked through bd.

### Task Tracking with bd

```bash
# List all open issues
bd list

# Create a new issue
bd create "Brief description of the task"

# Update issue status
bd update <issue-id> --status in_progress

# Close/resolve an issue
bd close <issue-id>

# Search for issues
bd search "keyword"

# Show issue details
bd show <issue-id>
```

### Workflow

1. Before starting work, check `bd list` for available tasks
2. Update issue status to `in_progress` when you begin
3. Make small, atomic commits after each logical change
4. Use conventional commits: `feat:`, `fix:`, `refactor:`, etc.
5. Work directly on the `main` branch for development tasks
6. Run linter and formatter before committing
7. Write descriptive commit messages explaining "why" not just "what"
8. Close issues with `bd close <issue-id>` when complete

## License

MIT

## Privacy

Tab Auditor:

- Runs entirely locally in your browser
- Does not collect or transmit any data to external servers
- Uses Chrome's local storage for settings only
- Does not access or analyze tab contents
- Minimal permissions: `tabs`, `storage`, `notifications`, `alarms`, `activeTab`
