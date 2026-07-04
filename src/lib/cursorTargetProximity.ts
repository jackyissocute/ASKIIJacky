/** Interactive targets that should win over the portrait long-press hint when nearby. */
export const PRIORITY_PROXIMITY_SELECTORS = ['.site-view-all', '.site-resume-link'] as const
export const PRIORITY_PROXIMITY_PADDING = 72

export function isPointInExpandedRect(
  x: number,
  y: number,
  rect: DOMRect,
  padding: number,
): boolean {
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  )
}

export function getPriorityProximityTarget(
  x: number,
  y: number,
  padding = PRIORITY_PROXIMITY_PADDING,
): Element | null {
  for (const selector of PRIORITY_PROXIMITY_SELECTORS) {
    const element = document.querySelector(selector)
    if (!element) continue

    const rect = element.getBoundingClientRect()
    if (isPointInExpandedRect(x, y, rect, padding)) return element
  }

  return null
}

/** True when the pointer should prefer a tracking box over the long-press hint. */
export function isLongPressSuppressedZone(
  x: number,
  y: number,
  padding = PRIORITY_PROXIMITY_PADDING,
): boolean {
  const el = document.elementFromPoint(x, y)
  if (el) {
    for (const selector of PRIORITY_PROXIMITY_SELECTORS) {
      if (el.closest(selector)) return true
    }
  }

  return getPriorityProximityTarget(x, y, padding) !== null
}
