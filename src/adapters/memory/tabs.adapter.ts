import type { TabFilter, Tab, TabsPort } from '../../core/ports/tabs.port';

export class InMemoryTabsAdapter implements TabsPort {
  private tabs: Tab[] = [];
  private onActivatedCallbacks: Array<(tabId: number) => void> = [];
  private onUpdatedCallbacks: Array<(tabId: number, changeInfo: Record<string, unknown>) => void> = [];
  private onCreatedCallbacks: Array<(tab: Tab) => void> = [];
  private onRemovedCallbacks: Array<(tabId: number) => void> = [];

  constructor(tabs: Tab[] = []) {
    this.tabs = [...tabs];
  }

  async query(_filter: TabFilter | object): Promise<Tab[]> {
    return [...this.tabs];
  }

  async remove(tabIds: number[]): Promise<void> {
    this.tabs = this.tabs.filter((tab) => !tab.id || !tabIds.includes(tab.id));
    tabIds.forEach((id) => {
      this.onRemovedCallbacks.forEach((cb) => cb(id));
    });
  }

  onActivated(callback: (tabId: number) => void): void {
    this.onActivatedCallbacks.push(callback);
  }

  onUpdated(callback: (tabId: number, changeInfo: Record<string, unknown>) => void): void {
    this.onUpdatedCallbacks.push(callback);
  }

  onCreated(callback: (tab: Tab) => void): void {
    this.onCreatedCallbacks.push(callback);
  }

  onRemoved(callback: (tabId: number) => void): void {
    this.onRemovedCallbacks.push(callback);
  }

  addTab(tab: Tab): void {
    this.tabs.push(tab);
    this.onCreatedCallbacks.forEach((cb) => cb(tab));
  }

  setTabs(tabs: Tab[]): void {
    this.tabs = [...tabs];
  }
}