import { describe, it, expect } from 'vitest';
import { getDomain, domainMatches, matchesAny } from './domain';

describe('getDomain', () => {
  it('should extract domain from valid URL', () => {
    expect(getDomain('https://example.com/page')).toBe('example.com');
    expect(getDomain('https://sub.example.com/path')).toBe('sub.example.com');
    expect(getDomain('http://test.org')).toBe('test.org');
  });

  it('should handle URL with port', () => {
    expect(getDomain('https://example.com:8080/page')).toBe('example.com');
  });

  it('should return empty string for undefined URL', () => {
    expect(getDomain(undefined)).toBe('');
  });

  it('should return empty string for invalid URL', () => {
    expect(getDomain('not-a-valid-url')).toBe('');
    expect(getDomain('')).toBe('');
  });

  it('should handle URLs with query parameters', () => {
    expect(getDomain('https://example.com?q=test')).toBe('example.com');
  });

  it('should handle URLs with fragments', () => {
    expect(getDomain('https://example.com#section')).toBe('example.com');
  });

  it('should handle special URL schemes', () => {
    expect(getDomain('data:text/html,<html>')).toBe('');
  });

  it('should handle chrome:// URLs', () => {
    expect(getDomain('chrome://settings')).toBe('settings');
  });

  it('should handle about:blank', () => {
    expect(getDomain('about:blank')).toBe('');
  });

  it('should handle file:// URLs', () => {
    expect(getDomain('file:///path/to/file.html')).toBe('');
  });

  it('should handle URLs with @ symbol', () => {
    expect(getDomain('https://user:pass@example.com')).toBe('example.com');
  });

  it('should handle very long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1000);
    expect(getDomain(longUrl)).toBe('example.com');
  });

  it('should handle URL with encoded characters', () => {
    expect(getDomain('https://example.com/path%20with%20spaces')).toBe('example.com');
  });

  it('should handle IP addresses', () => {
    expect(getDomain('https://192.168.1.1/path')).toBe('192.168.1.1');
    expect(getDomain('https://[::1]/path')).toBe('[::1]');
  });
});

describe('domainMatches', () => {
  it('should match exact domains', () => {
    expect(domainMatches('google.com', 'google.com')).toBe(true);
    expect(domainMatches('example.com', 'example.com')).toBe(true);
  });

  it('should not match different domains', () => {
    expect(domainMatches('google.com', 'google.org')).toBe(false);
    expect(domainMatches('google.com', 'notgoogle.com')).toBe(false);
  });

  it('should match subdomains', () => {
    expect(domainMatches('mail.google.com', 'google.com')).toBe(true);
    expect(domainMatches('api.example.com', 'example.com')).toBe(true);
    expect(domainMatches('a.b.c.example.com', 'example.com')).toBe(true);
  });

  it('should not match partial string matches', () => {
    expect(domainMatches('fakegoogle.com', 'google.com')).toBe(false);
    expect(domainMatches('example.com.org', 'example.com')).toBe(false);
  });

  it('should return false for empty domain', () => {
    expect(domainMatches('', 'google.com')).toBe(false);
  });

  it('should return false for empty pattern', () => {
    expect(domainMatches('google.com', '')).toBe(false);
  });

  it('should return false for both empty', () => {
    expect(domainMatches('', '')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(domainMatches('Google.com', 'google.com')).toBe(false);
    expect(domainMatches('google.com', 'Google.com')).toBe(false);
  });

  it('should handle unicode domains', () => {
    expect(domainMatches('xn--bcher-kva.com', 'bücher.com')).toBe(false);
  });

  it('should handle single character domain', () => {
    expect(domainMatches('a.com', 'a.com')).toBe(true);
    expect(domainMatches('b.a.com', 'a.com')).toBe(true);
  });

  it('should not match when pattern is a substring', () => {
    expect(domainMatches('notgoogle.com', 'google')).toBe(false);
  });

  it('should handle very long domains', () => {
    const longDomain = 'a.' + 'b'.repeat(100) + '.com';
    expect(domainMatches(longDomain, 'b'.repeat(100) + '.com')).toBe(true);
  });
});

describe('matchesAny', () => {
  it('should return true if domain matches any pattern', () => {
    expect(matchesAny('google.com', ['google.com', 'example.com'])).toBe(true);
    expect(matchesAny('mail.google.com', ['google.com', 'example.com'])).toBe(true);
  });

  it('should return false if domain matches no patterns', () => {
    expect(matchesAny('test.com', ['google.com', 'example.com'])).toBe(false);
  });

  it('should return false for empty patterns array', () => {
    expect(matchesAny('google.com', [])).toBe(false);
  });

  it('should handle empty domain', () => {
    expect(matchesAny('', ['google.com'])).toBe(false);
  });
});