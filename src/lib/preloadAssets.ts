import { PUBLIC_ASSETS } from '../config/site'
import { repoAsset } from './repoAsset'

export type PreloadProgress = {
  /** 0–1 real load fraction */
  progress: number
  label: string
}

type AssetStep = {
  id: string
  label: string
  weight: number
  load: (onFraction: (f: number) => void) => Promise<void>
}

/** Same-origin portrait cache shared with asciiBackground (CORS Image, not blob). */
const imageCache = new Map<string, HTMLImageElement>()

export function getCachedImage(url: string): HTMLImageElement | undefined {
  const img = imageCache.get(url)
  if (img?.complete && img.naturalWidth > 0) return img
  return undefined
}

/**
 * Load like asciiBackground does (crossOrigin anonymous) so the HTTP cache
 * is shared and the portrait is warm before the canvas mounts.
 */
function loadImage(
  src: string,
  onFraction: (f: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const cached = getCachedImage(src)
    if (cached) {
      onFraction(1)
      resolve()
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    onFraction(0)

    const finish = () => {
      if (img.complete && img.naturalWidth > 0) imageCache.set(src, img)
      onFraction(1)
      resolve()
    }

    img.onload = () => {
      if (img.decode) img.decode().then(finish, finish)
      else finish()
    }
    img.onerror = finish
    img.src = src
  })
}

async function loadFonts(onFraction: (f: number) => void): Promise<void> {
  onFraction(0)
  if (!document.fonts?.load) {
    onFraction(1)
    return
  }
  await Promise.all([
    document.fonts.load('400 16px "Geist Mono"'),
    document.fonts.load('500 16px "Geist Mono"'),
    document.fonts.load('600 16px "Geist Mono"'),
    document.fonts.load('700 16px "Geist Mono"'),
  ])
  await document.fonts.ready
  onFraction(1)
}

const STEPS: AssetStep[] = [
  { id: 'fonts', label: 'fonts', weight: 0.15, load: loadFonts },
  {
    id: 'profile',
    label: 'profile',
    weight: 0.25,
    load: (onFraction) => loadImage(repoAsset(PUBLIC_ASSETS.profilePhoto), onFraction),
  },
  {
    id: 'portrait',
    label: 'portrait',
    weight: 0.3,
    load: (onFraction) =>
      loadImage(repoAsset(PUBLIC_ASSETS.portraitLuminance), onFraction),
  },
  {
    id: 'color',
    label: 'color map',
    weight: 0.3,
    load: (onFraction) =>
      loadImage(repoAsset(PUBLIC_ASSETS.portraitColor), onFraction),
  },
]

let shared: Promise<void> | null = null
let last: PreloadProgress = { progress: 0, label: 'boot' }
const listeners = new Set<(p: PreloadProgress) => void>()

function emit(next: PreloadProgress) {
  last = next
  for (const cb of listeners) cb(next)
}

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function runPreload(): Promise<void> {
  let done = 0
  emit({ progress: 0, label: 'boot' })
  await nextPaint()

  for (const step of STEPS) {
    emit({ progress: done, label: step.label })
    let lastEmit = done
    await step.load((fraction) => {
      const next = Math.min(
        1,
        done + step.weight * Math.min(1, Math.max(0, fraction)),
      )
      if (next - lastEmit < 0.01 && fraction < 1) return
      lastEmit = next
      emit({ progress: next, label: step.label })
    })
    done += step.weight
    emit({ progress: Math.min(1, done), label: step.label })
    await nextPaint()
  }

  emit({ progress: 1, label: 'ready' })
}

/** Preload critical first-paint assets. Deduped across StrictMode remounts. */
export function preloadCriticalAssets(
  onProgress?: (p: PreloadProgress) => void,
): Promise<void> {
  if (onProgress) {
    listeners.add(onProgress)
    onProgress(last)
  }

  if (!shared) {
    shared = runPreload().finally(() => {
      listeners.clear()
    })
  }

  return shared.then(() => {
    if (onProgress) listeners.delete(onProgress)
  })
}

export function getPreloadSnapshot(): PreloadProgress {
  return last
}
