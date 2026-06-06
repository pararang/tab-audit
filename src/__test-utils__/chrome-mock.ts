import type { MockInstance } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFunction = MockInstance<any>;

interface MockAlarms {
  create: MockFunction;
  onAlarm: { addListener: MockFunction };
}

interface MockCommands {
  onCommand: { addListener: MockFunction };
}

interface MockRuntime {
  onInstalled?: { addListener: MockFunction };
  onStartup?: { addListener: MockFunction };
  onMessage?: { addListener: MockFunction };
  sendMessage: MockFunction;
  openOptionsPage?: MockFunction;
  getURL?: (path: string) => string;
  lastError?: { message: string };
}

interface MockTabGroups {
  query: MockFunction;
}

interface MockTabs {
  query: MockFunction;
  remove: MockFunction;
  onActivated?: { addListener: MockFunction };
  onUpdated?: { addListener: MockFunction };
  onCreated?: { addListener: MockFunction };
  onRemoved?: { addListener: MockFunction };
}

interface MockAction {
  setIcon: MockFunction;
}

interface MockNotifications {
  create: MockFunction;
}

interface MockStorageArea {
  get: MockFunction;
  set: MockFunction;
}

interface MockStorage {
  local: MockStorageArea;
  sync: MockStorageArea;
  onChanged?: { addListener: MockFunction };
}

export interface MockChrome {
  alarms?: MockAlarms;
  commands?: MockCommands;
  runtime: MockRuntime;
  tabGroups?: MockTabGroups;
  tabs: MockTabs;
  action?: MockAction;
  notifications?: MockNotifications;
  storage: MockStorage;
}
