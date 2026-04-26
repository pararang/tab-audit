import type { IconPath, ActionsPort } from '../../core/ports/actions.port';

export class ChromeActionsAdapter implements ActionsPort {
  async setIcon(path: IconPath): Promise<void> {
    return chrome.action.setIcon({ path } as { path: Record<string, string> });
  }
}