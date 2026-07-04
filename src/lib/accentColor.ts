export function readSiteAccentColor(fallback = '#f9a8d4'): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.querySelector('.site-main') ?? document.documentElement)
    .getPropertyValue('--color-accent')
    .trim()
  return value || fallback
}
