import { describe, it, expect } from 'vitest';
import { formatTime } from './utils';

describe('formatTime', () => {
  it('should format minutes less than 60', () => {
    expect(formatTime(30)).toBe('30m');
  });

  it('should format exactly 60 minutes as 1 hour', () => {
    expect(formatTime(60)).toBe('1h 0m');
  });

  it('should format hours and minutes', () => {
    expect(formatTime(90)).toBe('1h 30m');
  });

  it('should format 2 hours 15 minutes', () => {
    expect(formatTime(135)).toBe('2h 15m');
  });

  it('should handle zero minutes', () => {
    expect(formatTime(0)).toBe('0m');
  });

  it('should handle negative minutes gracefully', () => {
    expect(formatTime(-1)).toBe('0m');
  });

  it('should handle NaN input', () => {
    expect(formatTime(NaN)).toBe('0m');
  });

  it('should handle Infinity input', () => {
    expect(formatTime(Infinity)).toBe('0m');
  });
});
