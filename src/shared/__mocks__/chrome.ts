import { vi } from 'vitest';

const mockChrome = {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    sync: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    get: vi.fn(() => Promise.resolve({})),
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
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    openOptionsPage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
    onInstalled: {
      addListener: vi.fn(),
    },
    onStartup: {
      addListener: vi.fn(),
    },
    onMessage: {
      addListener: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  action: {
    setIcon: vi.fn(() => Promise.resolve()),
    getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  notifications: {
    create: vi.fn(() => Promise.resolve('mock-notification-id')),
    clear: vi.fn(),
    onClosed: {
      addListener: vi.fn(),
    },
  },
  tabGroups: {
    query: vi.fn(() => Promise.resolve([])),
    update: vi.fn(),
  },
};

vi.stubGlobal('chrome', mockChrome);
