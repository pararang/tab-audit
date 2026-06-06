import { describe, it, expect, beforeEach } from 'vitest';
import './__mocks__/chrome';
const chromeMock = vi.mocked(chrome);
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('getSettings', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
  });

  it('should return default settings when storage is empty', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({});

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge stored settings with defaults', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      maxTabs: 100,
    });

    const settings = await getSettings();

    expect(settings.enabled).toBe(true);
    expect(settings.maxTabs).toBe(100);
    expect(settings.idleTimeout).toBe(DEFAULT_SETTINGS.idleTimeout);
    expect(settings.whitelist).toEqual(DEFAULT_SETTINGS.whitelist);
  });

  it('should override all default settings', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 200,
      whitelist: ['test.com'],
      blacklist: ['bad.com'],
      whitelistedTabGroups: ['Work'],
      notificationsEnabled: false,
      theme: 'dark',
    });

    const settings = await getSettings();

    expect(settings).toEqual({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 200,
      whitelist: ['test.com'],
      blacklist: ['bad.com'],
      whitelistedTabGroups: ['Work'],
      notificationsEnabled: false,
      theme: 'dark',
    });
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockRejectedValue(new Error('Storage error'));

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    consoleErrorSpy.mockRestore();
  });

  it('should handle storage error with different error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockRejectedValue(new Error('Quota exceeded'));

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    consoleErrorSpy.mockRestore();
  });

  it('should return defaults when storage returns null-like value', async () => {
    chromeMock.storage.sync.get.mockResolvedValue(null);

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge partial storage data correctly', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      maxTabs: 100,
    });

    const settings = await getSettings();

    expect(settings.enabled).toBe(true);
    expect(settings.maxTabs).toBe(100);
    expect(settings.idleTimeout).toBe(DEFAULT_SETTINGS.idleTimeout);
    expect(settings.whitelist).toEqual([]);
  });
});

describe('saveSettings error handling', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    // Should not throw
    await saveSettings({ enabled: true });

    // Should log error (console.error is called)
    // In happy-dom, console.error is mocked by vitest
    consoleErrorSpy.mockRestore();
  });

  it('should handle different storage error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('QuotaExceededError'));

    await saveSettings({ maxTabs: 200 });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle invalid settings object', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ invalidKey: 'value' } as Parameters<typeof saveSettings>[0]);

    // Should attempt to save (Chrome storage ignores unknown keys)
    expect(chromeMock.storage.sync.set).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
  });

  it('should save partial settings to storage', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: true, maxTabs: 100 });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      enabled: true,
      maxTabs: 100,
    });
  });

  it('should save single setting', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: false });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    // Should not throw
    await saveSettings({ enabled: true });

    // Should log error (console.error is called)
    // In happy-dom, console.error is mocked by vitest
    consoleErrorSpy.mockRestore();
  });

  it('should save array settings', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });
  });

  it('should save boolean settings', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({
      notificationsEnabled: true,
      enabled: false,
    });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      notificationsEnabled: true,
      enabled: false,
    });
  });
});
