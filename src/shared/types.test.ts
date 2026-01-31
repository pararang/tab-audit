import { describe, it, expect } from 'vitest';
import { TabRule, CleanupSettings } from './types';

describe('types', () => {
  describe('TabRule', () => {
    it('should accept valid idle rule', () => {
      const rule: TabRule = {
        id: 'test-1',
        type: 'idle',
        enabled: true,
        settings: { timeout: 30 },
      };
      expect(rule.id).toBe('test-1');
      expect(rule.type).toBe('idle');
      expect(rule.enabled).toBe(true);
    });

    it('should accept valid duplicate rule', () => {
      const rule: TabRule = {
        id: 'test-2',
        type: 'duplicate',
        enabled: false,
        settings: {},
      };
      expect(rule.type).toBe('duplicate');
    });

    it('should accept valid domain rule', () => {
      const rule: TabRule = {
        id: 'test-3',
        type: 'domain',
        enabled: true,
        settings: { whitelist: ['example.com'] },
      };
      expect(rule.type).toBe('domain');
    });

    it('should accept complex settings', () => {
      const rule: TabRule = {
        id: 'test-4',
        type: 'idle',
        enabled: true,
        settings: {
          timeout: 60,
          notifyBefore: 5,
          exceptions: ['work.com'],
        },
      };
      expect(rule.settings.timeout).toBe(60);
    });
  });

  describe('CleanupSettings', () => {
    it('should accept valid settings', () => {
      const settings: CleanupSettings = {
        idleTimeout: 30,
        enabled: true,
      };
      expect(settings.idleTimeout).toBe(30);
      expect(settings.enabled).toBe(true);
    });

    it('should accept disabled state', () => {
      const settings: CleanupSettings = {
        idleTimeout: 60,
        enabled: false,
      };
      expect(settings.enabled).toBe(false);
    });

    it('should allow zero timeout', () => {
      const settings: CleanupSettings = {
        idleTimeout: 0,
        enabled: true,
      };
      expect(settings.idleTimeout).toBe(0);
    });
  });
});
