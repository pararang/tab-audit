// Mock Chrome APIs for testing
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
};

vi.stubGlobal('chrome', mockChrome);
