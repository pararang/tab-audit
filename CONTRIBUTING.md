# Contributing to Tab Auto Clean

Thank you for your interest in contributing! This guide will help you set up your development environment and contribute effectively to this Chrome extension.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Building](#building)
- [Git Workflow](#git-workflow)
- [Submitting Changes](#submitting-changes)
- [Code of Conduct](#code-of-conduct)

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome browser
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/tabclean.git
cd tabclean
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/miketheman/tabclean.git
```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Available Commands

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start watch mode for development      |
| `npm run build`         | Build development version             |
| `npm run build:prod`    | Build production (minified) version   |
| `npm run test`          | Run tests with UI                     |
| `npm run test:run`      | Run tests once                        |
| `npm run test:coverage` | Run tests with coverage report        |
| `npm run lint`          | Lint TypeScript files                 |
| `npm run lint:fix`      | Auto-fix linting issues               |
| `npm run format`        | Format code with Prettier             |
| `npm run format:check`  | Check formatting                      |
| `npm run package`       | Build and create Chrome Web Store zip |

### Loading the Extension in Chrome

1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder
5. Reload the extension after making changes

## Project Structure

```
tabclean/
├── src/
│   ├── background/
│   │   ├── index.ts      # Service worker - main cleanup logic
│   │   ├── index.test.ts # Unit tests
│   │   └── __mocks__/    # Chrome API mocks
│   ├── popup/
│   │   ├── popup.ts      # Browser action popup
│   │   ├── popup.html
│   │   └── popup.css
│   ├── options/
│   │   ├── options.ts    # Options page
│   │   ├── options.html
│   │   └── options.css
│   ├── shared/
│   │   ├── settings.ts   # Settings storage & retrieval
│   │   ├── types.ts      # TypeScript interfaces
│   │   ├── constants.ts  # Shared constants
│   │   └── utils.ts      # Utility functions
│   ├── icons/            # Extension icons
│   └── manifest.json     # Chrome extension manifest (V3)
├── vitest.config.ts      # Test configuration
├── tsconfig.json         # TypeScript configuration
├── eslintrc.js           # ESLint configuration
└── package.json
```

## Coding Standards

### TypeScript

- **Strict mode enabled** - no implicit `any`, null checks required
- **Target**: ES2020 with DOM lib
- Use explicit types for function parameters and returns
- Define interfaces for complex objects in `shared/types.ts`

### Naming Conventions

| Type                | Convention       | Example                       |
| ------------------- | ---------------- | ----------------------------- |
| Variables/Functions | camelCase        | `tabMonitor`, `closeIdleTabs` |
| Interfaces/Types    | PascalCase       | `Settings`, `TabRule`         |
| Constants           | UPPER_SNAKE_CASE | `DEFAULT_IDLE_TIME`           |
| Files               | kebab-case       | `tab-monitor.ts`              |

### Imports

```typescript
// Good
import { getSettings } from '../shared/settings';

// Bad
const settings = require('../shared/settings');
```

### Formatting (Prettier)

- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- Semicolons required
- Max line length: 100 characters

Run `npm run format` to auto-format your code.

### Error Handling

```typescript
// Good - wrap async Chrome API calls
try {
  const tabs = await chrome.tabs.query({});
  return processTabs(tabs);
} catch (error) {
  console.error('Failed to query tabs:', error);
  return [];
}
```

### Async Code

- Use `async/await` over Promise chains
- Use `Promise.allSettled()` for concurrent operations

## Testing

### Writing Tests

Tests use Vitest with happy-dom for DOM simulation.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('myFunction', () => {
  beforeEach(() => {
    // Reset state before each test
  });

  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### Running Tests

```bash
npm run test          # Run with UI
npm run test:run      # Run once (CI-friendly)
npm run test:coverage # Run with coverage
```

### Test Coverage Goals

- Current coverage: ~52%
- Target coverage: 70%
- New features should include tests

## Building

### Development Build

```bash
npm run dev  # Watch mode - rebuilds on changes
```

### Production Build

```bash
npm run build:prod  # Minified output in dist/
```

### Chrome Web Store Package

```bash
npm run package  # Creates tab-auto-clean.zip
```

## Git Workflow

### Branch Naming

- `feat/` for new features
- `fix/` for bug fixes
- `refactor/` for refactoring
- `test/` for test additions
- `docs/` for documentation

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add keyboard shortcuts for manual cleanup
fix: Handle Chrome API errors gracefully
test: Add unit tests for settings module
docs: Update CONTRIBUTING.md
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint`, `npm run test:coverage`, `npm run build`
4. Update documentation as needed
5. Submit a PR with a clear description

## Submitting Changes

1. Ensure all tests pass
2. Ensure linting passes
3. Ensure code is formatted
4. Write clear commit messages
5. Create a descriptive PR

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html).

## Getting Help

- Check existing [issues](../../issues) and [discussions](../../discussions)
- Open a new issue for bugs or feature requests
- Review the [AGENTS.md](AGENTS.md) for technical details

## Quick Reference

```bash
# Setup
git clone <fork-url>
cd tabclean
npm install

# Development
npm run dev          # Watch mode
npm run test         # Test with UI
npm run lint:fix     # Auto-fix linting

# Before committing
npm run lint
npm run test:run
npm run build
```
