/**
 * Applies the theme to the document.
 * @param theme - 'light', 'dark', or 'system'
 */
export function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  let resolvedTheme = theme;
  if (theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolvedTheme);
}
