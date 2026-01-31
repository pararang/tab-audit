// Mock Chrome APIs for options testing
import { vi } from 'vitest';

const mockChrome = {
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

// Mock window.matchMedia
const mockMatchMedia = vi.fn((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal('window', {
  matchMedia: mockMatchMedia,
});

// Mock documentElement
const mockDocumentElement = {
  setAttribute: vi.fn(),
};

// Mock document
const addEventListenerMock = vi.fn();

vi.stubGlobal('document', {
  documentElement: mockDocumentElement,
  addEventListener: addEventListenerMock,
});
