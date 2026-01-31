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
    onChanged: {
      addListener: vi.fn(),
    },
  },
};

// @ts-expect-error - Chrome global is complex, we only mock what's needed
global.chrome = mockChrome;

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

// @ts-expect-error - Mocking document
global.document = mockDocument;
