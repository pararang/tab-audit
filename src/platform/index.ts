import type { StoragePort } from '../core/ports/storage.port';
import type { TabsPort } from '../core/ports/tabs.port';
import type { NotificationsPort } from '../core/ports/notifications.port';
import type { ActionsPort } from '../core/ports/actions.port';
import type { RuntimePort, CommandsPort, AlarmsPort } from '../core/ports/events.port';
import { ChromeStorageAdapter } from '../adapters/chrome/storage.adapter';
import { ChromeTabsAdapter } from '../adapters/chrome/tabs.adapter';
import { ChromeNotificationsAdapter } from '../adapters/chrome/notifications.adapter';
import { ChromeActionsAdapter } from '../adapters/chrome/actions.adapter';
import { ChromeRuntimeAdapter, ChromeCommandsAdapter, ChromeAlarmsAdapter } from '../adapters/chrome/events.adapter';
import type { Settings } from '../shared/settings';

export interface Platform {
  storage: StoragePort;
  tabs: TabsPort;
  notifications: NotificationsPort;
  actions: ActionsPort;
  runtime: RuntimePort;
  commands: CommandsPort;
  alarms: AlarmsPort;
}

export function createPlatform(): Platform {
  return {
    storage: new ChromeStorageAdapter(),
    tabs: new ChromeTabsAdapter(),
    notifications: new ChromeNotificationsAdapter(),
    actions: new ChromeActionsAdapter(),
    runtime: new ChromeRuntimeAdapter(),
    commands: new ChromeCommandsAdapter(),
    alarms: new ChromeAlarmsAdapter(),
  };
}

export function createTestPlatform(defaultSettings: Settings, initialTabs: Parameters<typeof import('../adapters/memory/tabs.adapter').InMemoryTabsAdapter>[0] = []): Platform {
  const { InMemoryStorageAdapter } = require('../adapters/memory/storage.adapter');
  const { InMemoryTabsAdapter } = require('../adapters/memory/tabs.adapter');
  const { NoopNotificationsAdapter } = require('../adapters/memory/notifications.adapter');
  const { NoopActionsAdapter } = require('../adapters/memory/actions.adapter');

  return {
    storage: new InMemoryStorageAdapter(defaultSettings),
    tabs: new InMemoryTabsAdapter(initialTabs),
    notifications: new NoopNotificationsAdapter(),
    actions: new NoopActionsAdapter(),
    runtime: {
      getURL: (path: string) => `chrome-extension://mock/${path}`,
      onInstalled: () => {},
      onStartup: () => {},
      onMessage: () => {},
    },
    commands: { onCommand: () => {} },
    alarms: { create: () => {}, onAlarm: () => {} },
  };
}