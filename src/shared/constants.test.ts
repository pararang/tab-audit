import { describe, it, expect } from 'vitest';
import { DEFAULT_IDLE_TIME, MAX_TABS } from './constants';

describe('constants', () => {
  describe('DEFAULT_IDLE_TIME', () => {
    it('should be defined', () => {
      expect(DEFAULT_IDLE_TIME).toBeDefined();
    });

    it('should be a positive number', () => {
      expect(DEFAULT_IDLE_TIME).toBeGreaterThan(0);
    });

    it('should be 30 minutes', () => {
      expect(DEFAULT_IDLE_TIME).toBe(30);
    });

    it('should be a number type', () => {
      expect(typeof DEFAULT_IDLE_TIME).toBe('number');
    });
  });

  describe('MAX_TABS', () => {
    it('should be defined', () => {
      expect(MAX_TABS).toBeDefined();
    });

    it('should be a positive number', () => {
      expect(MAX_TABS).toBeGreaterThan(0);
    });

    it('should be 100', () => {
      expect(MAX_TABS).toBe(100);
    });

    it('should be a number type', () => {
      expect(typeof MAX_TABS).toBe('number');
    });

    it('should be greater than DEFAULT_IDLE_TIME', () => {
      expect(MAX_TABS).toBeGreaterThan(DEFAULT_IDLE_TIME);
    });
  });
});
