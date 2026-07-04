export const VIEW_ALL_SELECTOR = '.site-view-all'
export const VIEW_ALL_PROXIMITY_PADDING = 72

export function getViewAllElement(): Element | null {
  return document.querySelector(VIEW_ALL_SELECTOR)
}

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

export function getViewAllProximityTarget(
  x: number,
  y: number,
  padding = VIEW_ALL_PROXIMITY_PADDING,
): Element | null {
  const viewAll = getViewAllElement()
  if (!viewAll) return null

  const rect = viewAll.getBoundingClientRect()
  if (isPointInExpandedRect(x, y, rect, padding)) return viewAll

  return null
}

/** True when the pointer should prefer the view-all tracking box over long-press. */
export function isViewAllPriorityZone(
  x: number,
  y: number,
  padding = VIEW_ALL_PROXIMITY_PADDING,
): boolean {
  const el = document.elementFromPoint(x, y)
  if (el?.closest(VIEW_ALL_SELECTOR)) return true

  return getViewAllProximityTarget(x, y, padding) !== null
}
