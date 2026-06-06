/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MockInstance } from 'vitest';

export interface MockStorageArea {
  get: MockInstance<any>;
  set: MockInstance<any>;
}

export interface MockStorage {
  sync: MockStorageArea;
  local: MockStorageArea;
  onChanged: {
    addListener: MockInstance<any>;
  };
}

export interface MockTabs {
  query: MockInstance<any>;
  create: MockInstance<any>;
  update: MockInstance<any>;
  remove: MockInstance<any>;
  get: MockInstance<any>;
  onActivated: { addListener: MockInstance<any> };
  onCreated: { addListener: MockInstance<any> };
  onUpdated: { addListener: MockInstance<any> };
  onRemoved: { addListener: MockInstance<any> };
}

export interface MockRuntime {
  sendMessage: MockInstance<any>;
  openOptionsPage: MockInstance<any>;
  getURL: MockInstance<any>;
  onMessage: { addListener: MockInstance<any> };
}

export interface MockChrome {
  storage: MockStorage;
  tabs: MockTabs;
  runtime: MockRuntime;
  alarms: {
    create: MockInstance<any>;
    clear: MockInstance<any>;
    onAlarm: { addListener: MockInstance<any> };
  };
  commands: { onCommand: { addListener: MockInstance<any> } };
  action: {
    getURL: MockInstance<any>;
    setIcon: MockInstance<any>;
    setBadgeText: MockInstance<any>;
    setBadgeBackgroundColor: MockInstance<any>;
  };
  notifications: {
    create: MockInstance<any>;
    clear: MockInstance<any>;
    onClosed: { addListener: MockInstance<any> };
  };
  tabGroups: {
    query: MockInstance<any>;
    update: MockInstance<any>;
  };
}
