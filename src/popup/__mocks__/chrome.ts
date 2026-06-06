// Mock Chrome APIs for popup testing
import { vi } from 'vitest';

const mockChrome = {
  tabs: {
    query: vi.fn((queryInfo, callback) => {
      if (callback) {
        callback([]);
      }
      return Promise.resolve([]);
    }),
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    openOptionsPage: vi.fn(),
    getURL: (path: string) => `chrome-extension://mock/${path}`,
  },
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
};

vi.stubGlobal('chrome', mockChrome);

// Mock DOM elements
const mockElements: Record<string, HTMLElement | null> = {};

const mockDocument = {
  getElementById: (id: string) => mockElements[id] || null,
  documentElement: {
    setAttribute: vi.fn(),
  },
  addEventListener: vi.fn(),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

vi.stubGlobal('document', mockDocument);
