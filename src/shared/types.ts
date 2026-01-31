// Shared types
export interface TabRule {
  id: string;
  type: 'idle' | 'duplicate' | 'domain';
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface CleanupSettings {
  idleTimeout: number;
  enabled: boolean;
}
