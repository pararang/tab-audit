export interface RuntimePort {
  getURL(path: string): string;
  onInstalled(callback: () => void): void;
  onStartup(callback: () => void): void;
  onMessage(callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean): void;
}

export interface CommandsPort {
  onCommand(callback: (command: string) => void): void;
}

export interface AlarmsPort {
  create(name: string, options: { periodInMinutes?: number; delayInMinutes?: number }): void;
  onAlarm(callback: (alarm: { name: string }) => void): void;
}