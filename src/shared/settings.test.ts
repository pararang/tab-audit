/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import './__mocks__/chrome';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('getSettings', () => {
  beforeEach(() => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockReset();
  });

  it('should return default settings when storage is empty', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockResolvedValue({});

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge stored settings with defaults', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockResolvedValue({
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
    chrome.storage.sync.get.mockResolvedValue({
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

  it('should throw on storage error instead of returning defaults', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

    await expect(getSettings()).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should throw on storage error with different error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockRejectedValue(new Error('Quota exceeded'));

    await expect(getSettings()).rejects.toThrow('Quota exceeded');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should return defaults when storage returns null-like value', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockResolvedValue(null);

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge partial storage data correctly', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockResolvedValue({
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
    chrome.storage.sync.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockReset();
  });

  it('should throw on storage error instead of swallowing it', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    await expect(saveSettings({ enabled: true })).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should throw on different storage error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockRejectedValue(new Error('QuotaExceededError'));

    await expect(saveSettings({ maxTabs: 200 })).rejects.toThrow('QuotaExceededError');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle invalid settings object', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockResolvedValue(undefined);

    // @ts-ignore - intentionally passing invalid partial settings
    await saveSettings({ invalidKey: 'value' });

    // Should attempt to save (Chrome storage ignores unknown keys)
    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.sync.set).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.get.mockReset();
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockReset();
  });

  it('should save partial settings to storage', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: true, maxTabs: 100 });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      enabled: true,
      maxTabs: 100,
    });
  });

  it('should save single setting', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: false });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('should throw on storage error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    await expect(saveSettings({ enabled: true })).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should save array settings', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });
  });

  it('should save boolean settings', async () => {
    // @ts-expect-error - chrome is mocked
    chrome.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({
      notificationsEnabled: true,
      enabled: false,
    });

    // @ts-expect-error - chrome is mocked
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      notificationsEnabled: true,
      enabled: false,
    });
  });
});
