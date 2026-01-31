// Mock Chrome APIs for testing
import { vi } from 'vitest';

const mockChrome = {
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
    getURL: (path: string) => `chrome-extension://mock/${path}`,
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    remove: vi.fn(() => Promise.resolve()),
    onActivated: {
      addListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
    },
    onCreated: {
      addListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
    },
  },
  action: {
    setIcon: vi.fn(() => Promise.resolve()),
  },
  notifications: {
    create: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

// @ts-expect-error - Chrome global is complex, we only mock what's needed
global.chrome = mockChrome;
