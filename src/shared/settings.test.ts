/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockChrome } from '../__test-utils__/chrome-mock';
import './__mocks__/chrome';
const chromeMock = chrome as unknown as MockChrome;
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('getSettings', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
    chromeMock.storage.local.get.mockReset();
    chromeMock.storage.local.set.mockReset();
  });

  it('should return default settings when storage is empty', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({});
    chromeMock.storage.local.get.mockResolvedValue({});

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge stored settings with defaults', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      maxTabs: 100,
    });
    chromeMock.storage.local.get.mockResolvedValue({});

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
      notificationsEnabled: false,
      theme: 'dark',
    });
    chromeMock.storage.local.get.mockResolvedValue({
      whitelist: ['test.com'],
      blacklist: ['bad.com'],
      whitelistedTabGroups: ['Work'],
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
    chromeMock.storage.sync.get.mockRejectedValue(new Error('Storage error'));
    chromeMock.storage.local.get.mockResolvedValue({});

    await expect(getSettings()).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should throw on storage error with different error types', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.get.mockRejectedValue(new Error('Quota exceeded'));
    chromeMock.storage.local.get.mockResolvedValue({});

    await expect(getSettings()).rejects.toThrow('Quota exceeded');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should return defaults when storage returns null-like value', async () => {
    chromeMock.storage.sync.get.mockResolvedValue(null);
    chromeMock.storage.local.get.mockResolvedValue(null);

    const settings = await getSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should merge partial storage data correctly', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({
      enabled: true,
      maxTabs: 100,
    });
    chromeMock.storage.local.get.mockResolvedValue({});

    const settings = await getSettings();

    expect(settings.enabled).toBe(true);
    expect(settings.maxTabs).toBe(100);
    expect(settings.idleTimeout).toBe(DEFAULT_SETTINGS.idleTimeout);
    expect(settings.whitelist).toEqual([]);
  });

  it('should read domain lists from local storage', async () => {
    chromeMock.storage.sync.get.mockResolvedValue({});
    chromeMock.storage.local.get.mockResolvedValue({
      whitelist: ['example.com', 'test.org'],
      blacklist: ['bad.com'],
      whitelistedTabGroups: ['Important'],
    });

    const settings = await getSettings();

    expect(settings.whitelist).toEqual(['example.com', 'test.org']);
    expect(settings.blacklist).toEqual(['bad.com']);
    expect(settings.whitelistedTabGroups).toEqual(['Important']);
  });
});

describe('saveSettings error handling', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
    chromeMock.storage.local.get.mockReset();
    chromeMock.storage.local.set.mockReset();
  });

  it('should propagate storage errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    await expect(saveSettings({ enabled: true })).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should propagate quota exceeded errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('QuotaExceededError'));

    await expect(saveSettings({ maxTabs: 200 })).rejects.toThrow('QuotaExceededError');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should propagate local storage errors', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.local.set.mockRejectedValue(new Error('Local storage error'));

    await expect(saveSettings({ whitelist: ['test.com'] })).rejects.toThrow('Local storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should handle invalid settings object', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ invalidKey: 'value' } as Parameters<typeof saveSettings>[0]);

    expect(chromeMock.storage.sync.set).toHaveBeenCalled();
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    chromeMock.storage.sync.get.mockReset();
    chromeMock.storage.sync.set.mockReset();
    chromeMock.storage.local.get.mockReset();
    chromeMock.storage.local.set.mockReset();
  });

  it('should save scalar settings to sync storage', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: true, maxTabs: 100 });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      enabled: true,
      maxTabs: 100,
    });
    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
  });

  it('should save single setting', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);

    await saveSettings({ enabled: false });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('should throw on storage error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    chromeMock.storage.sync.set.mockRejectedValue(new Error('Storage error'));

    await expect(saveSettings({ enabled: true })).rejects.toThrow('Storage error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should save domain lists to local storage', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });

    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      whitelist: ['a.com', 'b.com'],
      blacklist: ['c.com'],
    });
  });

  it('should save whitelistedTabGroups to local storage', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({
      whitelistedTabGroups: ['Work', 'Personal'],
    });

    expect(chromeMock.storage.sync.set).not.toHaveBeenCalled();
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      whitelistedTabGroups: ['Work', 'Personal'],
    });
  });

  it('should split mixed settings across both backends', async () => {
    chromeMock.storage.sync.set.mockResolvedValue(undefined);
    chromeMock.storage.local.set.mockResolvedValue(undefined);

    await saveSettings({
      enabled: true,
      whitelist: ['test.com'],
      theme: 'dark',
    });

    expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
      enabled: true,
      theme: 'dark',
    });
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      whitelist: ['test.com'],
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
