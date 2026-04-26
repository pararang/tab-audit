import type { IconPath, ActionsPort } from '../../core/ports/actions.port';

export class NoopActionsAdapter implements ActionsPort {
  private calls: IconPath[] = [];

  async setIcon(path: IconPath): Promise<void> {
    this.calls.push(path);
  }

  getCalls(): IconPath[] {
    return [...this.calls];
  }

  clear(): void {
    this.calls = [];
  }
}