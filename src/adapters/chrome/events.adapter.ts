import type { RuntimePort, CommandsPort, AlarmsPort } from '../../core/ports/events.port';

export class ChromeRuntimeAdapter implements RuntimePort {
  getURL(path: string): string {
    return chrome.runtime.getURL(path);
  }

  onInstalled(callback: () => void): void {
    chrome.runtime.onInstalled.addListener(callback);
  }

  onStartup(callback: () => void): void {
    chrome.runtime.onStartup.addListener(callback);
  }

  onMessage(callback: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean): void {
    chrome.runtime.onMessage.addListener(callback);
  }
}

export class ChromeCommandsAdapter implements CommandsPort {
  onCommand(callback: (command: string) => void): void {
    chrome.commands.onCommand.addListener(callback);
  }
}

export class ChromeAlarmsAdapter implements AlarmsPort {
  create(name: string, options: { periodInMinutes?: number; delayInMinutes?: number }): void {
    chrome.alarms.create(name, options);
  }

  onAlarm(callback: (alarm: { name: string }) => void): void {
    chrome.alarms.onAlarm.addListener(callback);
  }
}