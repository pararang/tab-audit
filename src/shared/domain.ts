export function getDomain(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function domainMatches(domain: string, pattern: string): boolean {
  if (!domain || !pattern) return false;
  if (domain === pattern) return true;
  if (domain.endsWith('.' + pattern)) return true;
  return false;
}

export function matchesAny(domain: string, patterns: string[]): boolean {
  return patterns.some((pattern) => domainMatches(domain, pattern));
}