import type { TabFilter, Tab, TabsPort } from '../../core/ports/tabs.port';

export class ChromeTabsAdapter implements TabsPort {
  async query(filter: TabFilter | object): Promise<Tab[]> {
    return chrome.tabs.query(filter as chrome.tabs.QueryInfo) as Promise<Tab[]>;
  }

  async remove(tabIds: number[]): Promise<void> {
    return chrome.tabs.remove(tabIds);
  }

  onActivated(callback: (tabId: number) => void): void {
    chrome.tabs.onActivated.addListener((activeInfo) => callback(activeInfo.tabId));
  }

  onUpdated(callback: (tabId: number, changeInfo: Record<string, unknown>) => void): void {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => callback(tabId, changeInfo));
  }

  onCreated(callback: (tab: Tab) => void): void {
    chrome.tabs.onCreated.addListener(callback);
  }

  onRemoved(callback: (tabId: number) => void): void {
    chrome.tabs.onRemoved.addListener(callback);
  }
}