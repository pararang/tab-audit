import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockChrome } from '../__test-utils__/chrome-mock';
import './__mocks__/chrome';
const chromeMock = chrome as unknown as MockChrome;
import { applyTheme } from '../shared/theme';
import { getDomain } from '../shared/domain';
import {
  getTabStats,
  getPopupElements,
  updateTabCount,
  updateStats,
  updateButton,
  handleToggle,
  initPopup,
  generateQRCode,
  PopupElements,
} from './popup';

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

// Mock getElementById
const mockGetElementById = vi.fn();
const mockAddEventListener = vi.fn();

vi.stubGlobal('document', {
  documentElement: mockDocumentElement,
  getElementById: mockGetElementById,
  addEventListener: mockAddEventListener,
  createElement: vi.fn((tag) => ({
    tagName: tag.toUpperCase(),
    textContent: '',
    className: '',
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    style: {},
    clientWidth: 100,
    clientHeight: 100,
    getContext: vi.fn(() => ({
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      clearRect: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100),
      })),
      putImageData: vi.fn(),
      scale: vi.fn(),
    })),
  })),
});

// Mock chrome.runtime.openOptionsPage
chromeMock.runtime = {
  ...chromeMock.runtime,
  openOptionsPage: vi.fn(),
};

// Mock chrome.runtime.sendMessage
chromeMock.runtime.sendMessage = vi.fn();

describe('applyTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set light theme directly', () => {
    applyTheme('light');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should set dark theme directly', () => {
    applyTheme('dark');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should resolve system preference to light', () => {
    mockMatchMedia.mockReturnValue({ matches: false, media: '', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
    applyTheme('system');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should resolve system preference to dark', () => {
    mockMatchMedia.mockReturnValue({ matches: true, media: '', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
    applyTheme('system');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
});

describe('getDomain', () => {
  it('should extract domain from valid URL', () => {
    expect(getDomain('https://example.com/page')).toBe('example.com');
    expect(getDomain('https://sub.example.com/path')).toBe('sub.example.com');
    expect(getDomain('http://test.org')).toBe('test.org');
  });

  it('should handle URL with port', () => {
    expect(getDomain('https://example.com:8080/page')).toBe('example.com');
  });

  it('should return empty string for invalid URL', () => {
    expect(getDomain('not-a-valid-url')).toBe('');
    expect(getDomain('')).toBe('');
    expect(getDomain('http://')).toBe('');
  });

  it('should handle URL with query parameters', () => {
    expect(getDomain('https://example.com?q=test')).toBe('example.com');
  });

  it('should handle URL with fragments', () => {
    expect(getDomain('https://example.com#section')).toBe('example.com');
  });

  it('should handle URL with authentication', () => {
    expect(getDomain('https://user:pass@example.com')).toBe('example.com');
  });
});

describe('getTabStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zero cleaned and dash for top domain with no tabs', async () => {
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.storage.local.get.mockResolvedValue({ tabsCleanedToday: 0 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
    expect(stats.topDomain).toBe('-');
  });

  it('should count tabs per domain correctly', async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { url: 'https://example.com/page1' },
      { url: 'https://example.com/page2' },
      { url: 'https://test.com/page' },
    ]);
    chromeMock.storage.local.get.mockResolvedValue({ tabsCleanedToday: 5 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(5);
    expect(stats.topDomain).toBe('example.com');
  });

  it('should skip tabs without URLs', async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { url: undefined },
      { url: 'https://example.com' },
      { url: null },
    ]);
    chromeMock.storage.local.get.mockResolvedValue({});

    const stats = await getTabStats();

    expect(stats.topDomain).toBe('example.com');
  });

  it('should return cleanedToday from storage', async () => {
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.storage.local.get.mockResolvedValue({ tabsCleanedToday: 42 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(42);
  });

  it('should return 0 for cleanedToday when not in storage', async () => {
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.storage.local.get.mockResolvedValue({});

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
  });

  it('should handle Chrome API errors gracefully', async () => {
    chromeMock.tabs.query.mockRejectedValue(new Error('API error'));

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
    expect(stats.topDomain).toBe('-');
  });

  it('should identify most frequent domain', async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { url: 'https://a.com/page1' },
      { url: 'https://a.com/page2' },
      { url: 'https://b.com/page' },
      { url: 'https://b.com/page2' },
      { url: 'https://c.com/page' },
    ]);
    chromeMock.storage.local.get.mockResolvedValue({});

    const stats = await getTabStats();

    expect(stats.topDomain).toBe('a.com');
  });
});

describe('getPopupElements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElementById.mockReset();
    mockAddEventListener.mockReset();
  });

  it('should return null when tab-count element is missing', () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'tab-count') return null;
      return {} as HTMLElement;
    });
    const result = getPopupElements();
    expect(result).toBeNull();
  });

  it('should return null when cleaned-count element is missing', () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'cleaned-count') return null;
      if (id === 'tab-count') return {} as HTMLElement;
      if (id === 'top-domain') return {} as HTMLElement;
      if (id === 'toggle-clean') return {} as HTMLButtonElement;
      return {} as HTMLElement;
    });
    const result = getPopupElements();
    expect(result).toBeNull();
  });

  it('should return popup elements when all required elements exist', () => {
    const mockTabCount = {} as HTMLElement;
    const mockCleanedCount = {} as HTMLElement;
    const mockTopDomain = {} as HTMLElement;
    const mockToggleButton = {} as HTMLButtonElement;
    const mockSettingsButton = {} as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'tab-count': mockTabCount,
        'cleaned-count': mockCleanedCount,
        'top-domain': mockTopDomain,
        'toggle-clean': mockToggleButton,
        'open-settings': mockSettingsButton,
      };
      return elements[id] || null;
    });

    const result = getPopupElements();
    expect(result).not.toBeNull();
    expect(result?.tabCount).toBe(mockTabCount);
    expect(result?.cleanedCount).toBe(mockCleanedCount);
    expect(result?.topDomain).toBe(mockTopDomain);
    expect(result?.toggleButton).toBe(mockToggleButton);
    expect(result?.settingsButton).toBe(mockSettingsButton);
  });

  it('should return null for settingsButton when it does not exist', () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'open-settings') return null;
      return {} as HTMLElement;
    });
    const result = getPopupElements();
    expect(result).not.toBeNull();
    expect(result?.settingsButton).toBeNull();
  });
});

describe('updateTabCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update tab count display', () => {
    const mockElements: PopupElements = {
      tabCount: { textContent: '' } as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: {} as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.tabs.query.mockImplementation((_query: any, callback: any) => {
      callback([{ id: 1 } as chrome.tabs.Tab, { id: 2 } as chrome.tabs.Tab, { id: 3 } as chrome.tabs.Tab]);
    });

    updateTabCount(mockElements);

    expect(mockElements.tabCount.textContent).toBe('3');
  });

  it('should show 0 for no tabs', () => {
    const mockElements: PopupElements = {
      tabCount: { textContent: '' } as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: {} as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.tabs.query.mockImplementation((_query: any, callback: any) => {
      callback([]);
    });

    updateTabCount(mockElements);

    expect(mockElements.tabCount.textContent).toBe('0');
  });
});

describe('updateStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update stats display with valid data', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: { textContent: '' } as HTMLElement,
      topDomain: { textContent: '' } as HTMLElement,
      toggleButton: {} as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.tabs.query.mockResolvedValue([
      { url: 'https://example.com/page1' },
      { url: 'https://example.com/page2' },
    ]);
    chromeMock.storage.local.get.mockResolvedValue({ tabsCleanedToday: 10 });

    await updateStats(mockElements);

    expect(mockElements.cleanedCount.textContent).toBe('10');
    expect(mockElements.topDomain.textContent).toBe('example.com');
  });

  it('should show dash for cleaned count when zero', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: { textContent: '' } as HTMLElement,
      topDomain: { textContent: '' } as HTMLElement,
      toggleButton: {} as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.storage.local.get.mockResolvedValue({ tabsCleanedToday: 0 });

    await updateStats(mockElements);

    expect(mockElements.cleanedCount.textContent).toBe('-');
    expect(mockElements.topDomain.textContent).toBe('-');
  });

  it('should show dash on error', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: { textContent: 'initial' } as HTMLElement,
      topDomain: { textContent: 'initial' } as HTMLElement,
      toggleButton: {} as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.tabs.query.mockRejectedValue(new Error('API error'));

    await updateStats(mockElements);

    expect(mockElements.cleanedCount.textContent).toBe('-');
    expect(mockElements.topDomain.textContent).toBe('-');
  });
});

describe('updateButton', () => {
  it('should update button to show Disable Auto Clean when enabled', () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: { textContent: '', className: '' } as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    updateButton(mockElements, true);

    expect(mockElements.toggleButton.textContent).toBe('Disable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('enabled');
  });

  it('should update button to show Enable Auto Clean when disabled', () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: { textContent: '', className: '' } as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    updateButton(mockElements, false);

    expect(mockElements.toggleButton.textContent).toBe('Enable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('disabled');
  });
});

describe('handleToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should toggle enabled state and send message when turning on', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: { textContent: '', className: '' } as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.storage.sync.get.mockResolvedValue({ enabled: false });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);
    chromeMock.runtime.sendMessage.mockResolvedValue(undefined);

    await handleToggle(mockElements);

    expect(mockElements.toggleButton.textContent).toBe('Disable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('enabled');
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({ action: 'runCleanup' });
  });

  it('should toggle enabled state without sending message when turning off', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: { textContent: '', className: '' } as HTMLButtonElement,
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: null as unknown as HTMLElement,
    };

    chromeMock.storage.sync.get.mockResolvedValue({ enabled: true });
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await handleToggle(mockElements);

    expect(mockElements.toggleButton.textContent).toBe('Enable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('disabled');
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });
});

describe('initPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElementById.mockReset();
    mockAddEventListener.mockReset();
  });

  it('should return early when popup elements are not found', async () => {
    mockGetElementById.mockReturnValue(null);

    await initPopup();

    expect(chromeMock.storage.sync.get).not.toHaveBeenCalled();
  });

  it('should initialize when all popup elements exist', async () => {
    const mockTabCount = { textContent: '' } as HTMLElement;
    const mockCleanedCount = { textContent: '' } as HTMLElement;
    const mockTopDomain = { textContent: '' } as HTMLElement;
    const mockToggleButton = {
      textContent: '',
      className: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'tab-count': mockTabCount,
        'cleaned-count': mockCleanedCount,
        'top-domain': mockTopDomain,
        'toggle-clean': mockToggleButton,
        'open-settings': null as unknown as Element,
      };
      return elements[id] || null;
    });

    chromeMock.storage.sync.get.mockResolvedValue({ enabled: true, theme: 'dark' });
    chromeMock.tabs.query.mockResolvedValue([]);

    await initPopup();

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(chromeMock.storage.sync.get).toHaveBeenCalled();
  });
});

describe('generateQRCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return early when qrCanvas is missing', async () => {
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: null as unknown as HTMLCanvasElement,
      qrUrl: document.createElement('div'),
    };

    await generateQRCode(elements);
    expect(chromeMock.tabs.query).not.toHaveBeenCalled();
  });

  it('should return early when qrUrl is missing', async () => {
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl: null as unknown as HTMLElement,
    };

    await generateQRCode(elements);
    expect(chromeMock.tabs.query).not.toHaveBeenCalled();
  });

  it('should show message for chrome:// URLs', async () => {
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl,
    };

    chromeMock.tabs.query.mockResolvedValue([{ url: 'chrome://settings' }]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('Cannot generate QR for this page');
  });

  it('should show message for chrome-extension:// URLs', async () => {
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl,
    };

    chromeMock.tabs.query.mockResolvedValue([{ url: 'chrome-extension://abcdefghijk/lmnop.html' }]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('Cannot generate QR for this page');
  });

  it('should generate QR code and show URL for valid tab', async () => {
    const qrCanvas = document.createElement('canvas');
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas,
      qrUrl,
    };

    chromeMock.tabs.query.mockResolvedValue([{ url: 'https://example.com/page' }]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('https://example.com/page');
  });

  it('should truncate long URLs', async () => {
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl,
    };

    const longUrl = 'https://example.com/very/long/path/with/many/segments/and/query/parameters?foo=bar&baz=qux';
    chromeMock.tabs.query.mockResolvedValue([{ url: longUrl }]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('https://example.com/very/long/path/with/...');
  });

  it('should handle missing tab gracefully', async () => {
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl,
    };

    chromeMock.tabs.query.mockResolvedValue([]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('Cannot generate QR for this page');
  });

  it('should handle tabs without URL gracefully', async () => {
    const qrUrl = document.createElement('div');
    const elements = {
      tabCount: document.createElement('div'),
      cleanedCount: document.createElement('div'),
      topDomain: document.createElement('div'),
      toggleButton: document.createElement('button'),
      settingsButton: null,
      qrCanvas: document.createElement('canvas'),
      qrUrl,
    };

    chromeMock.tabs.query.mockResolvedValue([{ url: undefined }]);

    await generateQRCode(elements);
    expect(qrUrl.textContent).toBe('Cannot generate QR for this page');
  });
});
