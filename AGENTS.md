# Tab Auditor — Project Knowledge Base

**Stack:** TypeScript · Webpack 5 · Chrome Extension (MV3) · Vitest · ESLint · Prettier · PNPM
**Architecture:** Hexagonal (ports/adapters) — core interfaces in `src/core/ports/`, implementations in `src/adapters/`
**Commit:** (run `git rev-parse --short HEAD`)

## Structure

```
src/
├── adapters/         # External system adapters
│   ├── chrome/       # Chrome API implementations (5 adapters)
│   └── memory/       # In-memory test doubles (4 adapters)
├── background/       # Service worker — cleanup engine, activity tracking
│   └── index.ts      # Tab cleanup rules, event wiring (direct chrome.* API)
├── core/             # Business logic layer
│   ├── ports/        # Hexagonal port interfaces (5 ports)
│   ├── services/     # Reserved for future business logic (currently empty)
│   └── index.ts      # Barrel export
├── icons/            # Extension icon files (PNG, including yellow variants)
├── options/          # Extension options page (full settings form)
├── platform/         # DI container factory (createPlatform / createTestPlatform)
├── popup/            # Browser action popup UI (stats, toggle, QR)
├── shared/           # Shared code
│   ├── settings.ts   # Settings interface, defaults, storage helpers
│   ├── types.ts      # TypeScript interfaces (legacy)
│   ├── constants.ts  # Shared constants
│   ├── domain.ts     # Domain parsing utilities
│   └── utils.ts      # Utility functions
└── manifest.json     # Chrome extension manifest (V3)
```

## Quick Start

```bash
pnpm install
pnpm dev          # Watch mode build
pnpm test         # Vitest watch
pnpm lint         # ESLint
pnpm build:prod   # Production build → dist/
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| Add cleanup logic | `src/background/index.ts` | Direct `chrome.*` API |
| Add a new port interface | `src/core/ports/` | Pure TS interfaces |
| Add a new adapter | `src/adapters/chrome/` + wire in `src/platform/index.ts` | Chrome API wrapper |
| Add a test double | `src/adapters/memory/` | In-memory fake for port |
| Change settings model | `src/shared/settings.ts` | Cross-cutting — update all consumers |
| Add UI feature | `src/popup/popup.ts` or `src/options/options.ts` | Popup vs options page |
| Modify cleanup rules order | `src/background/index.ts` | `applyCleanupRules()` function |
| Edit domain matching logic | `src/shared/domain.ts` | `domainMatches()` function |

## Conventions

- **Single quotes**, semicolons, trailing commas, 100 char width (Prettier enforced)
- **Strict TypeScript** — `strict: true` in tsconfig, ES2020 target/module
- **Port interfaces** suffixed `Port` (e.g. `TabsPort`, `StoragePort`)
- **Adapter classes** suffixed `Adapter` (e.g. `ChromeTabsAdapter`, `InMemoryStorageAdapter`)
- **Tests** co-located as `*.test.ts`, happy-dom environment, min 85% coverage
- **`__mocks__/` dirs** for manual chrome API mocks used across test files
- **PNPM** package manager with frozen lockfile in CI
- **ESLint**: `@typescript-eslint/no-unused-vars` error with `_` prefix ignore, `ban-ts-comment` off
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, etc. Explain *why* not just *what*

## Cleanup Rules (executed in order by `applyCleanupRules()`)

1. **Tab group whitelist** — Skip tabs in whitelisted groups
2. **Domain whitelist** — Skip tabs on whitelisted domains
3. **Blacklist** — Close tabs on blacklisted domains (if inactive)
4. **Idle timeout** — Close tabs idle beyond configured timeout
5. **Duplicate tabs** — Close duplicate URLs, keep most recently accessed
6. **Max tabs** — Close oldest inactive tabs if over limit

## Domain Matching (`src/shared/domain.ts`)

- **Exact match**: `google.com` matches `google.com`
- **Subdomain match**: `google.com` matches `mail.google.com`, `docs.google.com`
- **Partial match NOT supported**: `google.com` does NOT match `fakegoogle.com`

## Anti-Patterns (This Project)

- **NO** `@ts-ignore` / `@ts-expect-error` / `as any` — strict mode violations
- **NO** new direct `chrome.*` calls in `src/background/` — use port/adapter pattern for new integrations
- **NO** modifying `src/shared/settings.ts` without updating all consumers
- **NO** editing `dist/` — build output only
- **NO** `eval()` or inline scripts — blocked by MV3 CSP
- **NO** editing `src/core/ports/` adapter-facing interfaces without updating both chrome + memory adapters
- **NO** decreasing coverage below baseline — run `pnpm test:coverage` before committing

## Commands

```bash
pnpm build          # Development build
pnpm build:prod     # Production build (minified)
pnpm dev            # Watch mode
pnpm test           # Test watch
pnpm test:run       # Single test run
pnpm test:coverage  # With coverage report
pnpm test:ui        # Vitest UI mode
pnpm lint           # ESLint check
pnpm lint:fix       # ESLint auto-fix
pnpm format         # Prettier format
pnpm format:check   # Prettier check
pnpm package        # Build prod → zip dist/
```

## Testing & Coverage

- **Coverage threshold**: minimum 85%
- **Excluded from coverage**: `__mocks__/`, `*.test.ts`, `types.ts`
- Coverage must NOT decrease from baseline
- All new code must be tested

## Release Process

Automated releases via GitHub Actions (`.github/workflows/release.yml`):

```bash
git tag v1.0.0
git push origin v1.0.0
```

Triggers: test → build → create `tab-audit.zip` → publish GitHub release with auto-generated notes.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): Push/PR to main — lint, format check, test with coverage, build prod, upload to Codecov
- **Release** (`.github/workflows/release.yml`): Tag `v*` — bump version, test, build, package, create GitHub release
- **Matrix**: Node 20.x, 22.x

## Dependencies

- `qrcode` (runtime) — QR code generation in popup
- `@types/chrome`, `typescript`, `webpack/*`, `ts-loader`, `vitest`, `eslint`, `prettier` (dev)

## Issue Tracking & Workflow

Project uses **GitHub Issues** with `gh` CLI for all interactions:

```bash
gh issue list                          # Find available work
gh issue view <number>                 # View issue details
gh issue create --title "..." --body "..."   # Create new issue
gh issue comment <number> --body "..."       # Comment on issue
gh issue close <number>                # Close an issue
gh issue reopen <number>               # Reopen an issue
```

**Workflow**:
1. Check `gh issue list` for available tasks
2. Comment `"Taking this on"` on the issue before starting
3. Make small, atomic commits after each logical change
4. Use conventional commits: `feat:`, `fix:`, `refactor:`, etc.
5. Work directly on `main` branch for development tasks
6. Run linter and formatter before committing
7. Write descriptive commit messages explaining *why* not just *what*
8. Close issues with `gh issue close <number>` when complete
9. Push to remote: `git pull --rebase && git push && git status`

## Gotchas

- `src/background/index.ts` uses `chrome.*` API directly — NOT port/adapter pattern. This is legacy.
- `constants.ts` defaults duplicate `DEFAULT_SETTINGS` in `settings.ts` — update both.
- `src/adapters/memory/` **excludes** events adapter — test platform inlines mock event handlers.
- `src/core/ports/` must remain free of adapter and business logic — pure interfaces only.
