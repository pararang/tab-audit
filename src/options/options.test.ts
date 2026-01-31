// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome APIs and DOM before importing the module
import './__mocks__/chrome';
import {
  applyTheme,
  isValidSettings,
  getFormElements,
  loadSettingsToForm,
  saveSettingsFromForm,
  initOptions,
  bindEventListeners,
  OptionsFormElements,
} from './options';
import { DEFAULT_SETTINGS } from '../shared/settings';

// Get the mockDocumentElement from the global scope
const mockDocumentElement = (
  global as { document?: { documentElement?: { setAttribute: vi.Mock } } }
).document?.documentElement;

// Mock document.getElementById to return null initially
const mockGetElementById = vi.fn();
vi.stubGlobal('document', {
  getElementById: mockGetElementById,
  documentElement: mockDocumentElement,
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  createElement: vi.fn((tag) => ({
    tagName: tag.toUpperCase(),
    href: '',
    download: '',
    click: vi.fn(),
    setAttribute: vi.fn(),
    value: '',
    checked: false,
    textContent: '',
  })),
});

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockURL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
};
vi.stubGlobal('URL', mockURL);

// Mock Blob
const mockBlob = {
  type: '',
};
vi.stubGlobal(
  'Blob',
  vi.fn().mockImplementation(() => mockBlob),
);

// Mock alert
vi.stubGlobal('alert', vi.fn());

// Mock window.matchMedia with addEventListener support
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

describe('applyTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set light theme directly', () => {
    applyTheme('light');
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should set dark theme directly', () => {
    applyTheme('dark');
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should resolve system preference to light', () => {
    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({ matches: false });
    applyTheme('system');
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should resolve system preference to dark', () => {
    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({ matches: true });
    applyTheme('system');
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
});

describe('isValidSettings', () => {
  it('should return true for valid full settings', () => {
    const validSettings = {
      enabled: true,
      idleTimeout: 30,
      maxTabs: 50,
      theme: 'dark',
      whitelist: ['example.com'],
      blacklist: ['bad.com'],
      notificationsEnabled: true,
    };
    expect(isValidSettings(validSettings)).toBe(true);
  });

  it('should return true for valid partial settings', () => {
    const partialSettings = {
      enabled: false,
      idleTimeout: 60,
    };
    expect(isValidSettings(partialSettings)).toBe(true);
  });

  it('should return true for empty object', () => {
    expect(isValidSettings({})).toBe(true);
  });

  it('should return false for null', () => {
    expect(isValidSettings(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isValidSettings('string')).toBe(false);
    expect(isValidSettings(123)).toBe(false);
    expect(isValidSettings(true)).toBe(false);
  });

  it('should return false for invalid enabled type', () => {
    const invalid = {
      enabled: 'true',
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid idleTimeout type', () => {
    const invalid = {
      idleTimeout: '30',
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid maxTabs type', () => {
    const invalid = {
      maxTabs: [],
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid theme value', () => {
    const invalid = {
      theme: 'blue',
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid whitelist type', () => {
    const invalid = {
      whitelist: 'example.com',
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid blacklist type', () => {
    const invalid = {
      blacklist: { example: 'com' },
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should return false for invalid notificationsEnabled type', () => {
    const invalid = {
      notificationsEnabled: 'yes',
    };
    expect(isValidSettings(invalid)).toBe(false);
  });

  it('should accept valid theme values', () => {
    expect(isValidSettings({ theme: 'light' })).toBe(true);
    expect(isValidSettings({ theme: 'dark' })).toBe(true);
    expect(isValidSettings({ theme: 'system' })).toBe(true);
  });

  it('should accept valid whitelist with various domains', () => {
    const settings = {
      whitelist: ['a.com', 'b.co', 'sub.example.org'],
    };
    expect(isValidSettings(settings)).toBe(true);
  });

  it('should accept valid blacklist with various domains', () => {
    const settings = {
      blacklist: ['facebook.com', 'twitter.com'],
    };
    expect(isValidSettings(settings)).toBe(true);
  });

  it('should handle nested invalid properties gracefully', () => {
    const invalid = {
      enabled: true,
      invalidProp: 'should be ignored',
      anotherInvalid: 123,
    };
    expect(isValidSettings(invalid)).toBe(true);
  });
});

describe('getFormElements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElementById.mockReset();
  });

  it('should return null when form element is missing', () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'options-form') return null;
      return {} as Element;
    });
    const result = getFormElements();
    expect(result).toBeNull();
  });

  it('should return null when idle-timeout element is missing', () => {
    mockGetElementById.mockImplementation((id) => {
      if (id === 'idle-timeout') return null;
      if (id === 'options-form') return {} as HTMLFormElement;
      return {} as Element;
    });
    const result = getFormElements();
    expect(result).toBeNull();
  });

  it('should return form elements when all exist', () => {
    const mockForm = {} as HTMLFormElement;
    const mockInput = {} as HTMLInputElement;
    const mockSelect = {} as HTMLSelectElement;
    const mockTextarea = {} as HTMLTextAreaElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockInput,
        'restore-btn': mockInput,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    const result = getFormElements();
    expect(result).not.toBeNull();
    expect(result?.form).toBe(mockForm);
    expect(result?.idleTimeout).toBe(mockInput);
    expect(result?.theme).toBe(mockSelect);
  });
});

describe('loadSettingsToForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load settings into form elements', async () => {
    const mockElements: OptionsFormElements = {
      form: {} as HTMLFormElement,
      idleTimeout: { value: '' } as HTMLInputElement,
      maxTabs: { value: '' } as HTMLInputElement,
      theme: { value: '' } as HTMLSelectElement,
      whitelist: { value: '' } as HTMLTextAreaElement,
      blacklist: { value: '' } as HTMLTextAreaElement,
      notificationsEnabled: { checked: false } as HTMLInputElement,
      backupBtn: {} as HTMLButtonElement,
      restoreBtn: {} as HTMLButtonElement,
      restoreFile: {} as HTMLInputElement,
    };

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      idleTimeout: 45,
      maxTabs: 100,
      theme: 'dark',
      whitelist: ['example.com', 'test.org'],
      blacklist: ['facebook.com'],
      notificationsEnabled: false,
    });

    await loadSettingsToForm(mockElements);

    expect(mockElements.idleTimeout.value).toBe('45');
    expect(mockElements.maxTabs.value).toBe('100');
    expect(mockElements.theme.value).toBe('dark');
    expect(mockElements.whitelist.value).toBe('example.com\ntest.org');
    expect(mockElements.blacklist.value).toBe('facebook.com');
    expect(mockElements.notificationsEnabled.checked).toBe(false);
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('should use default theme when loading settings', async () => {
    const mockElements: OptionsFormElements = {
      form: {} as HTMLFormElement,
      idleTimeout: { value: '' } as HTMLInputElement,
      maxTabs: { value: '' } as HTMLInputElement,
      theme: { value: '' } as HTMLSelectElement,
      whitelist: { value: '' } as HTMLTextAreaElement,
      blacklist: { value: '' } as HTMLTextAreaElement,
      notificationsEnabled: { checked: true } as HTMLInputElement,
      backupBtn: {} as HTMLButtonElement,
      restoreBtn: {} as HTMLButtonElement,
      restoreFile: {} as HTMLInputElement,
    };

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      theme: 'system',
    });

    await loadSettingsToForm(mockElements);

    expect(mockElements.theme.value).toBe('system');
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalled();
  });
});

describe('saveSettingsFromForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save settings from form and return them', async () => {
    const mockElements: OptionsFormElements = {
      form: {} as HTMLFormElement,
      idleTimeout: { value: '60' } as HTMLInputElement,
      maxTabs: { value: '75' } as HTMLSelectElement,
      theme: { value: 'light' } as HTMLSelectElement,
      whitelist: { value: 'a.com\nb.com' } as HTMLTextAreaElement,
      blacklist: { value: 'c.com' } as HTMLTextAreaElement,
      notificationsEnabled: { checked: true } as HTMLInputElement,
      backupBtn: {} as HTMLButtonElement,
      restoreBtn: {} as HTMLButtonElement,
      restoreFile: {} as HTMLInputElement,
    };

    const result = await saveSettingsFromForm(mockElements);

    expect(result.idleTimeout).toBe(60);
    expect(result.maxTabs).toBe(75);
    expect(result.theme).toBe('light');
    expect(result.whitelist).toEqual(['a.com', 'b.com']);
    expect(result.blacklist).toEqual(['c.com']);
    expect(result.notificationsEnabled).toBe(true);
    expect(result.warningShown).toBe(false);
    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(mockDocumentElement?.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('should filter empty lines from whitelist and blacklist', async () => {
    const mockElements: OptionsFormElements = {
      form: {} as HTMLFormElement,
      idleTimeout: { value: '30' } as HTMLInputElement,
      maxTabs: { value: '50' } as HTMLInputElement,
      theme: { value: 'dark' } as HTMLSelectElement,
      whitelist: { value: 'a.com\n\nb.com\n  ' } as HTMLTextAreaElement,
      blacklist: { value: '\n\nc.com\n\n' } as HTMLTextAreaElement,
      notificationsEnabled: { checked: true } as HTMLInputElement,
      backupBtn: {} as HTMLButtonElement,
      restoreBtn: {} as HTMLButtonElement,
      restoreFile: {} as HTMLInputElement,
    };

    const result = await saveSettingsFromForm(mockElements);

    expect(result.whitelist).toEqual(['a.com', 'b.com']);
    expect(result.blacklist).toEqual(['c.com']);
  });
});

describe('bindEventListeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElementById.mockReset();
    vi.restoreAllMocks();
  });

  it('should set up all event listeners on form elements', () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
    }

    expect(mockForm.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
    expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(mockInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    // @ts-expect-error - window is mocked
    expect(window.matchMedia).toHaveBeenCalled();
  });

  it('should handle backup button click with error', async () => {
    // Suppress expected error output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
      // Get the backup click handler
      const backupCall = mockButton.addEventListener.mock.calls.find((call) => call[0] === 'click');
      if (backupCall) {
        const backupHandler = backupCall[1];
        await backupHandler();
      }
    }

    // Should handle error gracefully (alert would be called)
    expect(global.alert).toHaveBeenCalledWith('Error exporting settings');
    consoleErrorSpy.mockRestore();
  });

  it('should handle restore button click', () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;
    const mockRestoreFile = {
      click: vi.fn(),
      addEventListener: vi.fn(),
      value: '',
    } as unknown as HTMLInputElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockRestoreFile,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
      // Get the restore button click handler (second button with click listener)
      const clickCalls = mockButton.addEventListener.mock.calls.filter(
        (call) => call[0] === 'click',
      );
      if (clickCalls.length >= 2) {
        const restoreHandler = clickCalls[1][1];
        restoreHandler();
      }
    }

    // Should trigger file input click
    expect(mockRestoreFile.click).toHaveBeenCalled();
  });

  it('should handle file input change with invalid JSON', async () => {
    // Suppress expected error output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
      // Get the file change handler
      const changeCall = mockInput.addEventListener.mock.calls.find((call) => call[0] === 'change');
      if (changeCall) {
        const changeHandler = changeCall[1];
        const mockEvent = {
          target: {
            files: [
              {
                text: vi.fn().mockResolvedValue('not valid json'),
              },
            ],
          },
        };
        await changeHandler(mockEvent);
      }
    }

    // Should show alert for invalid JSON
    expect(global.alert).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle file input change with invalid settings', async () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
      // Get the file change handler
      const changeCall = mockInput.addEventListener.mock.calls.find((call) => call[0] === 'change');
      if (changeCall) {
        const changeHandler = changeCall[1];
        const mockEvent = {
          target: {
            files: [
              {
                text: vi
                  .fn()
                  .mockResolvedValue('{"invalid": "settings", "enabled": "not-a-boolean"}'),
              },
            ],
          },
        };
        await changeHandler(mockEvent);
      }
    }

    // Should show alert for invalid settings format
    expect(global.alert).toHaveBeenCalledWith('Invalid settings file format');
  });

  it('should show success alert when settings are restored successfully', async () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
      // Get the file change handler
      const changeCall = mockInput.addEventListener.mock.calls.find((call) => call[0] === 'change');
      if (changeCall) {
        const changeHandler = changeCall[1];
        const mockEvent = {
          target: {
            files: [
              {
                text: vi.fn().mockResolvedValue('{"idleTimeout": 45}'),
              },
            ],
          },
        };
        await changeHandler(mockEvent);
      }
    }

    // Should show success alert
    expect(global.alert).toHaveBeenCalledWith('Settings restored successfully!');
  });

  it('should listen for system theme changes', async () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    const mockAddEventListener = vi.fn();
    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: mockAddEventListener,
    });

    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({ ...DEFAULT_SETTINGS, theme: 'system' });

    const elements = getFormElements();
    if (elements) {
      bindEventListeners(elements);
    }

    // Should call addEventListener on matchMedia for theme change detection
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('initOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElementById.mockReset();
  });

  it('should return early when form elements are not found', async () => {
    mockGetElementById.mockReturnValue(null);

    await initOptions();

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.get).not.toHaveBeenCalled();
  });

  it('should initialize when all form elements exist', async () => {
    const mockForm = {
      addEventListener: vi.fn(),
    } as unknown as HTMLFormElement;
    const mockInput = {
      value: '',
      checked: false,
      addEventListener: vi.fn(),
    } as unknown as HTMLInputElement;
    const mockSelect = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLSelectElement;
    const mockTextarea = {
      value: '',
      addEventListener: vi.fn(),
    } as unknown as HTMLTextAreaElement;
    const mockButton = {
      addEventListener: vi.fn(),
    } as unknown as HTMLButtonElement;

    mockGetElementById.mockImplementation((id) => {
      const elements: Record<string, Element> = {
        'options-form': mockForm,
        'idle-timeout': mockInput,
        'max-tabs': mockInput,
        theme: mockSelect,
        whitelist: mockTextarea,
        blacklist: mockTextarea,
        'notifications-enabled': mockInput,
        'backup-btn': mockButton,
        'restore-btn': mockButton,
        'restore-file': mockInput,
      };
      return elements[id] || null;
    });

    // @ts-expect-error - window is mocked
    window.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
    });
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue(DEFAULT_SETTINGS);

    await initOptions();

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.get).toHaveBeenCalled();
  });
});
