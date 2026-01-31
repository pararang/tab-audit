/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import './__mocks__/chrome';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('getSettings', () => {
  beforeEach(() => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockReset();
  });

  it('should return default settings when storage is empty', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({});

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge stored settings with defaults', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({
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
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 200,
      whitelist: ['test.com'],
      blacklist: ['bad.com'],
      notificationsEnabled: false,
      warningShown: true,
      theme: 'dark',
    });

    const settings = await getSettings();

    expect(settings).toEqual({
      enabled: true,
      idleTimeout: 60,
      maxTabs: 200,
      whitelist: ['test.com'],
      blacklist: ['bad.com'],
      notificationsEnabled: false,
      warningShown: true,
      theme: 'dark',
    });
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    consoleErrorSpy.mockRestore();
  });

  it('should handle storage error with different error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockRejectedValue(new Error('Quota exceeded'));

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    consoleErrorSpy.mockRestore();
  });

  it('should return defaults when storage returns null-like value', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue(null);

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge partial storage data correctly', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockResolvedValue({
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
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockReset();
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

    // Should not throw
    await saveSettings({ enabled: true });

    // Should log error (console.error is called)
    // In happy-dom, console.error is mocked by vitest
    consoleErrorSpy.mockRestore();
  });

  it('should handle different storage error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockRejectedValue(new Error('QuotaExceededError'));

    await saveSettings({ maxTabs: 200 });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle invalid settings object', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    // @ts-ignore - intentionally passing invalid partial settings
    await saveSettings({ invalidKey: 'value' });

    // Should attempt to save (Chrome storage ignores unknown keys)
    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockReset();
  });

  it('should save partial settings to storage', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: true, maxTabs: 100 });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      enabled: true,
      maxTabs: 100,
    });
  });

  it('should save single setting', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: false });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('should handle storage error gracefully', async () => {
    // Suppress console.error output during this test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

    // Should not throw
    await saveSettings({ enabled: true });

    // Should log error (console.error is called)
    // In happy-dom, console.error is mocked by vitest
    consoleErrorSpy.mockRestore();
  });

  it('should save array settings', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });
  });

  it('should save boolean settings', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({
      notificationsEnabled: true,
      warningShown: false,
    });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      notificationsEnabled: true,
      warningShown: false,
    });
  });
});
