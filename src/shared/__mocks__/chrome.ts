// Mock Chrome APIs for testing
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
