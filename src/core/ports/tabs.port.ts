export interface TabFilter {
  active?: boolean;
  currentWindow?: boolean;
  lastAccessed?: number;
  status?: string;
  title?: string;
  url?: string | string[];
  windowId?: number;
}

export interface Tab {
  id?: number;
  index: number;
  pinned: boolean;
  highlighted: boolean;
  active: boolean;
  windowId: number;
  incognito: boolean;
  width?: number;
  height?: number;
  lastAccessed?: number;
  url?: string;
  title?: string;
  frozen: boolean;
}

export interface TabsPort {
  query(filter: TabFilter | {}): Promise<Tab[]>;
  remove(tabIds: number[]): Promise<void>;
  onActivated(callback: (tabId: number) => void): void;
  onUpdated(callback: (tabId: number, changeInfo: Record<string, unknown>) => void): void;
  onCreated(callback: (tab: Tab) => void): void;
  onRemoved(callback: (tabId: number) => void): void;
}