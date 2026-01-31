// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './__mocks__/chrome';
import {
  applyTheme,
  getDomain,
  getTabStats,
  getPopupElements,
  updateTabCount,
  updateStats,
  updateButton,
  handleToggle,
  initPopup,
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
});

// Mock chrome.runtime.openOptionsPage
// @ts-expect-error - chrome is mocked
chrome.runtime = {
  ...chrome.runtime,
  openOptionsPage: vi.fn(),
};

// Mock chrome.runtime.sendMessage
// @ts-expect-error - chrome is mocked
chrome.runtime.sendMessage = vi.fn();

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
    mockMatchMedia.mockReturnValue({ matches: false });
    applyTheme('system');
    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should resolve system preference to dark', () => {
    mockMatchMedia.mockReturnValue({ matches: true });
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
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ tabsCleanedToday: 0 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
    expect(stats.topDomain).toBe('-');
  });

  it('should count tabs per domain correctly', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([
      { url: 'https://example.com/page1' },
      { url: 'https://example.com/page2' },
      { url: 'https://test.com/page' },
    ]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ tabsCleanedToday: 5 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(5);
    expect(stats.topDomain).toBe('example.com');
  });

  it('should skip tabs without URLs', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([
      { url: undefined },
      { url: 'https://example.com' },
      { url: null },
    ]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({});

    const stats = await getTabStats();

    expect(stats.topDomain).toBe('example.com');
  });

  it('should return cleanedToday from storage', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ tabsCleanedToday: 42 });

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(42);
  });

  it('should return 0 for cleanedToday when not in storage', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({});

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
  });

  it('should handle Chrome API errors gracefully', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockRejectedValue(new Error('API error'));

    const stats = await getTabStats();

    expect(stats.cleanedToday).toBe(0);
    expect(stats.topDomain).toBe('-');
  });

  it('should identify most frequent domain', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([
      { url: 'https://a.com/page1' },
      { url: 'https://a.com/page2' },
      { url: 'https://b.com/page' },
      { url: 'https://b.com/page2' },
      { url: 'https://c.com/page' },
    ]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({});

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
    };

    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockImplementation((query, callback) => {
      callback([{ id: 1 }, { id: 2 }, { id: 3 }]);
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
    };

    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockImplementation((query, callback) => {
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
    };

    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([
      { url: 'https://example.com/page1' },
      { url: 'https://example.com/page2' },
    ]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ tabsCleanedToday: 10 });

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
    };

    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([]);
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ tabsCleanedToday: 0 });

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
    };

    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockRejectedValue(new Error('API error'));

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
    };

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ enabled: false });
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);
    // @ts-expect-error - chrome is mocked
    chrome.runtime.sendMessage.mockResolvedValue(undefined);

    await handleToggle(mockElements);

    expect(mockElements.toggleButton.textContent).toBe('Disable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('enabled');
    // @ts-expect-error - chrome is mocked
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'runCleanup' });
  });

  it('should toggle enabled state without sending message when turning off', async () => {
    const mockElements: PopupElements = {
      tabCount: {} as HTMLElement,
      cleanedCount: {} as HTMLElement,
      topDomain: {} as HTMLElement,
      toggleButton: { textContent: '', className: '' } as HTMLButtonElement,
      settingsButton: null,
    };

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ enabled: true });
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    await handleToggle(mockElements);

    expect(mockElements.toggleButton.textContent).toBe('Enable Auto Clean');
    expect(mockElements.toggleButton.className).toBe('disabled');
    // @ts-expect-error - chrome is mocked
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
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

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.get).not.toHaveBeenCalled();
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
        'open-settings': null,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ enabled: true, theme: 'dark' });
    // @ts-expect-error - chrome is mocked
    chrome.tabs.query.mockResolvedValue([]);

    await initPopup();

    expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.get).toHaveBeenCalled();
  });
});
