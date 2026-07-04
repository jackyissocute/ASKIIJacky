export interface AsciiBackgroundOptions {
  fontSize?: number
  charWidth?: number
  charHeight?: number
  textPool?: string
  backgroundColor?: string
  textColor?: string
  cursorRadius?: number
  /** Soft falloff width outside the core void (px) */
  cursorFeather?: number
  /** Per-letter edge wobble strength (0–1) */
  cursorEdgeNoise?: number
  cursorStretchX?: number
  cursorStretchY?: number
  fontWeight?: number
  portraitUrl?: string
  /** Full-color portrait aligned 1:1 with portraitUrl */
  portraitColorUrl?: string
  /** Alpha above this counts as person; transparent pixels use base textColor */
  portraitAlphaThreshold?: number
  /** Draw height as fraction of viewport (width follows image aspect) */
  portraitHeightRatio?: number
  /** Align portrait box to viewport edge */
  portraitAlign?: 'right' | 'center'
  /** Fine-tune highlight spread while preserving relative luminance on person */
  portraitHighlightGain?: number
  /** Base milliseconds between swaps for participating cells */
  driftIntervalMs?: number
  /** Per-cell interval jitter range (+/- ms) for noise texture */
  driftIntervalJitterMs?: number
  /** Only 1/driftStride cells swap; hash picks them evenly across the grid */
  driftStride?: number
  /** Milliseconds before a press on the person counts as long-press */
  longPressMs?: number
  /** Outward ripple speed while holding (px / s) */
  colorRevealSpeed?: number
  /** Noise dissolve rate on release (progress / s); typically faster than reveal */
  colorHideSpeed?: number
  /** Ripple edge wobble strength (0–1) */
  colorRippleEdgeNoise?: number
  /** Soft feather width for color ripple frontier (px) */
  colorRippleFeather?: number
  colorRippleStretchX?: number
  colorRippleStretchY?: number
  /** Person-letter drift speed multiplier while color is revealing */
  colorRevealDriftMultiplier?: number
  /** Person-letter drift speed multiplier while color is hiding (typically higher) */
  colorHideDriftMultiplier?: number
}

export interface AsciiBackgroundController {
  destroy: () => void
}

const DEFAULT_TEXT =
  'WEBHOOKS THE HARD FIELDS ALREADY BUILT BUILDER WITH GUARDRAILS BYPASSED IN PRODUCTION NO DRIFT · WIRED UP SCHEMA AS A SYSTEM FETCH LAYER SOLVED CDN BYPASSED STUDIO EDITORS ACTUALLY USE INVALIDATE ON PUBLISH EVERY DECISION ALREADY MADE SEO DONE NOT DEFERRED AGENT NATIVE '

type ColorInteractionMode = 'idle' | 'reveal' | 'hide'

function cellHash(col: number, row: number) {
  let n = col * 374761393 + row * 668265263
  n = (n ^ (n >> 13)) * 1274126177
  return (n ^ (n >> 16)) >>> 0
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

interface PortraitLayout {
  left: number
  top: number
  width: number
  height: number
}

interface PortraitSample {
  luminance: number
  alpha: number
  isPerson: boolean
}

interface PortraitPixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

export function createAsciiBackground(
  canvas: HTMLCanvasElement,
  options: AsciiBackgroundOptions = {},
): AsciiBackgroundController {
  const rawCtx = canvas.getContext('2d', { alpha: false })
  if (!rawCtx) {
    throw new Error('Could not acquire 2D canvas context')
  }
  const mainCtx: CanvasRenderingContext2D = rawCtx

  const fontSize = options.fontSize ?? 10
  const charWidth = options.charWidth ?? 7
  const charHeight = options.charHeight ?? 12
  const textPool = (options.textPool ?? DEFAULT_TEXT).toUpperCase()
  const backgroundColor = options.backgroundColor ?? '#1a1a1a'
  const textColor = options.textColor ?? '#3d3d3d'
  const cursorRadius = options.cursorRadius ?? 88
  const cursorFeather = options.cursorFeather ?? 54
  const cursorEdgeNoise = options.cursorEdgeNoise ?? 0.2
  const cursorStretchX = options.cursorStretchX ?? 1.06
  const cursorStretchY = options.cursorStretchY ?? 0.9
  const fontWeight = options.fontWeight ?? 600
  const portraitUrl = options.portraitUrl
  const portraitColorUrl = options.portraitColorUrl
  const portraitAlphaThreshold = options.portraitAlphaThreshold ?? 10
  const portraitHeightRatio = options.portraitHeightRatio ?? 0.95
  const portraitAlign = options.portraitAlign ?? 'right'
  const portraitHighlightGain = options.portraitHighlightGain ?? 1.0
  const driftIntervalMs = options.driftIntervalMs ?? 400
  const driftIntervalJitterMs = options.driftIntervalJitterMs ?? 160
  const driftStride = options.driftStride ?? 48
  const longPressMs = options.longPressMs ?? 380
  const colorRevealSpeed = options.colorRevealSpeed ?? 190
  const colorHideSpeed = options.colorHideSpeed ?? 320
  const colorRippleEdgeNoise = options.colorRippleEdgeNoise ?? 0.34
  const colorRippleFeather = options.colorRippleFeather ?? 78
  const colorRippleStretchX = options.colorRippleStretchX ?? 1.1
  const colorRippleStretchY = options.colorRippleStretchY ?? 0.88
  const colorRevealDriftMultiplier = options.colorRevealDriftMultiplier ?? 2.4
  const colorHideDriftMultiplier =
    options.colorHideDriftMultiplier ??
    colorRevealDriftMultiplier * (colorHideSpeed / colorRevealSpeed)

  const baseRgb = parseHexColor(textColor)

  let cols = 0
  let rows = 0
  let dpr = 1
  let viewportW = 0
  let viewportH = 0
  let animationFrameId = 0
  let driftNow = 0
  let lastTickNow = 0

  let mouseX = -9999
  let mouseY = -9999

  let portraitLayout: PortraitLayout | null = null
  let portraitPixels: PortraitPixels | null = null
  let colorPortraitPixels: PortraitPixels | null = null
  let personLumMin = 0
  let personLumMax = 1

  let personCells: Uint8Array = new Uint8Array(0)
  let revealGrid: Uint8Array = new Uint8Array(0)

  let colorMode: ColorInteractionMode = 'idle'
  let rippleRadius = 0
  let rippleOriginX = 0
  let rippleOriginY = 0
  let hideProgress = 0

  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let pressAnchorX = 0
  let pressAnchorY = 0

  const image = portraitUrl ? new Image() : null
  if (image) {
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
  }

  const colorImage = portraitColorUrl ? new Image() : null
  if (colorImage) {
    colorImage.crossOrigin = 'anonymous'
    colorImage.decoding = 'async'
  }

  const pixelCanvas = document.createElement('canvas')
  const pixelCtx = pixelCanvas.getContext('2d', { willReadFrequently: true })

  function cellIndex(col: number, row: number) {
    return row * cols + col
  }

  function resetColorInteraction() {
    colorMode = 'idle'
    rippleRadius = 0
    hideProgress = 0
    revealGrid.fill(0)
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function analyzePersonLuminanceRange() {
    if (!portraitPixels) return

    const { width, height, data } = portraitPixels
    let min = 1
    let max = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        const alpha = data[index + 3]
        if (alpha <= portraitAlphaThreshold) continue

        const lum =
          (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255

        if (lum < min) min = lum
        if (lum > max) max = lum
      }
    }

    personLumMin = min
    personLumMax = Math.max(min + 0.001, max)
  }

  function cacheImagePixels(source: CanvasImageSource, naturalWidth: number, naturalHeight: number): PortraitPixels | null {
    if (!pixelCtx || naturalWidth === 0) return null

    pixelCanvas.width = naturalWidth
    pixelCanvas.height = naturalHeight
    pixelCtx.drawImage(source, 0, 0)

    const imageData = pixelCtx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height)
    return {
      width: pixelCanvas.width,
      height: pixelCanvas.height,
      data: imageData.data,
    }
  }

  function cachePortraitPixels() {
    if (!image || image.naturalWidth === 0) {
      portraitPixels = null
      return
    }

    portraitPixels = cacheImagePixels(image, image.naturalWidth, image.naturalHeight)
    analyzePersonLuminanceRange()
    rebuildPersonCells()
  }

  function cacheColorPortraitPixels() {
    if (!colorImage || colorImage.naturalWidth === 0) {
      colorPortraitPixels = null
      return
    }

    colorPortraitPixels = cacheImagePixels(colorImage, colorImage.naturalWidth, colorImage.naturalHeight)
  }

  function computePortraitLayout(): PortraitLayout | null {
    if (!portraitPixels) return null

    const imgW = portraitPixels.width
    const imgH = portraitPixels.height
    const aspect = imgW / imgH

    let height = viewportH * portraitHeightRatio
    let width = height * aspect

    if (width > viewportW) {
      width = viewportW
      height = width / aspect
    }

    const left = portraitAlign === 'right' ? viewportW - width : (viewportW - width) * 0.5
    const top = viewportH - height

    return { left, top, width, height }
  }

  function readPixel(data: Uint8ClampedArray, width: number, x: number, y: number): PortraitSample {
    const imgH = Math.floor(data.length / (width * 4))
    const ix = Math.max(0, Math.min(width - 1, x))
    const iy = Math.max(0, Math.min(imgH - 1, y))
    const index = (iy * width + ix) * 4
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const alpha = data[index + 3]
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

    return {
      luminance,
      alpha,
      isPerson: alpha > portraitAlphaThreshold,
    }
  }

  function samplePortraitCellFrom(
    pixels: PortraitPixels | null,
    col: number,
    row: number,
  ): PortraitSample | null {
    if (!pixels || !portraitLayout) return null

    const cellX0 = col * charWidth
    const cellY0 = row * charHeight
    const cellX1 = cellX0 + charWidth
    const cellY1 = cellY0 + charHeight
    const { left, top, width, height } = portraitLayout

    if (cellX1 <= left || cellX0 >= left + width || cellY1 <= top || cellY0 >= top + height) {
      return null
    }

    const imgW = pixels.width
    const imgH = pixels.height

    const sampleX0 = Math.max(0, Math.floor(((Math.max(cellX0, left) - left) / width) * imgW))
    const sampleY0 = Math.max(0, Math.floor(((Math.max(cellY0, top) - top) / height) * imgH))
    const sampleX1 = Math.min(imgW, Math.ceil(((Math.min(cellX1, left + width) - left) / width) * imgW))
    const sampleY1 = Math.min(imgH, Math.ceil(((Math.min(cellY1, top + height) - top) / height) * imgH))

    if (sampleX1 <= sampleX0 || sampleY1 <= sampleY0) return null

    let lumSum = 0
    let alphaMax = 0
    let personCount = 0

    for (let iy = sampleY0; iy < sampleY1; iy++) {
      for (let ix = sampleX0; ix < sampleX1; ix++) {
        const pixel = readPixel(pixels.data, imgW, ix, iy)
        alphaMax = Math.max(alphaMax, pixel.alpha)
        if (!pixel.isPerson) continue
        lumSum += pixel.luminance
        personCount++
      }
    }

    if (personCount === 0) {
      return { luminance: 0, alpha: alphaMax, isPerson: false }
    }

    return {
      luminance: lumSum / personCount,
      alpha: alphaMax,
      isPerson: true,
    }
  }

  function samplePortraitCell(col: number, row: number) {
    return samplePortraitCellFrom(portraitPixels, col, row)
  }

  function sampleColorCell(col: number, row: number): string | null {
    if (!colorPortraitPixels || !portraitLayout) return null

    const cellX0 = col * charWidth
    const cellY0 = row * charHeight
    const cellX1 = cellX0 + charWidth
    const cellY1 = cellY0 + charHeight
    const { left, top, width, height } = portraitLayout

    if (cellX1 <= left || cellX0 >= left + width || cellY1 <= top || cellY0 >= top + height) {
      return null
    }

    const imgW = colorPortraitPixels.width
    const imgH = colorPortraitPixels.height
    const data = colorPortraitPixels.data

    const sampleX0 = Math.max(0, Math.floor(((Math.max(cellX0, left) - left) / width) * imgW))
    const sampleY0 = Math.max(0, Math.floor(((Math.max(cellY0, top) - top) / height) * imgH))
    const sampleX1 = Math.min(imgW, Math.ceil(((Math.min(cellX1, left + width) - left) / width) * imgW))
    const sampleY1 = Math.min(imgH, Math.ceil(((Math.min(cellY1, top + height) - top) / height) * imgH))

    if (sampleX1 <= sampleX0 || sampleY1 <= sampleY0) return null

    let rSum = 0
    let gSum = 0
    let bSum = 0
    let personCount = 0

    for (let iy = sampleY0; iy < sampleY1; iy++) {
      for (let ix = sampleX0; ix < sampleX1; ix++) {
        const pixel = readPixel(data, imgW, ix, iy)
        if (!pixel.isPerson) continue
        const index = (iy * imgW + ix) * 4
        rSum += data[index]
        gSum += data[index + 1]
        bSum += data[index + 2]
        personCount++
      }
    }

    if (personCount === 0) return null

    const r = Math.round(rSum / personCount)
    const g = Math.round(gSum / personCount)
    const b = Math.round(bSum / personCount)
    return `rgb(${r}, ${g}, ${b})`
  }

  function mapPersonLuminance(luminance: number) {
    const span = personLumMax - personLumMin
    const normalized = (luminance - personLumMin) / span
    return clamp01(normalized * portraitHighlightGain)
  }

  function colorForCell(col: number, row: number) {
    const pixel = samplePortraitCell(col, row)

    if (pixel === null || !pixel.isPerson) {
      return textColor
    }

    const t = mapPersonLuminance(pixel.luminance)
    const r = Math.round(baseRgb.r + t * (255 - baseRgb.r))
    const g = Math.round(baseRgb.g + t * (255 - baseRgb.g))
    const b = Math.round(baseRgb.b + t * (255 - baseRgb.b))

    return `rgb(${r}, ${g}, ${b})`
  }

  function rippleDist(col: number, row: number, originX: number, originY: number) {
    const cx = col * charWidth + charWidth * 0.5
    const cy = row * charHeight + charHeight * 0.5
    const dx = cx - originX
    const dy = cy - originY
    const angle = Math.atan2(dy, dx)

    const ex = dx / colorRippleStretchX
    const ey = dy / colorRippleStretchY
    const baseDist = Math.hypot(ex, ey)

    const hash = cellHash(col, row)
    const hash2 = cellHash(col + 19, row - 11)
    const noiseScale = Math.max(60, baseDist * 0.14)

    const wobble = ((hash % 1000) / 1000 - 0.5) * 2 * colorRippleEdgeNoise * noiseScale
    const microWobble = (((hash >>> 8) % 1000) / 1000 - 0.5) * colorRippleEdgeNoise * noiseScale * 0.72
    const lobe =
      Math.sin(angle * 3.9 + hash * 0.0013) * colorRippleEdgeNoise * 0.62 * noiseScale
    const lobe2 =
      Math.sin(angle * 6.7 + hash2 * 0.0009 + 0.8) * colorRippleEdgeNoise * 0.34 * noiseScale
    const timeWobble =
      Math.sin(driftNow * 0.0045 + hash * 0.0024 + angle * 2.4) * colorRippleEdgeNoise * 26

    return baseDist + wobble + microWobble + lobe + lobe2 + timeWobble
  }

  /** 0–1 strength for soft, dithered ripple frontier */
  function rippleRevealStrength(col: number, row: number) {
    const dist = rippleDist(col, row, rippleOriginX, rippleOriginY)
    const core = Math.max(10, rippleRadius - colorRippleFeather)
    const outer = rippleRadius + colorRippleFeather * 0.9

    if (dist <= core) return 1
    if (dist >= outer) return 0

    const edgeT = (dist - core) / (outer - core)
    return 1 - smoothstep(0, 1, edgeT)
  }

  function shouldRevealCell(col: number, row: number) {
    const strength = rippleRevealStrength(col, row)
    if (strength >= 1) return true
    if (strength <= 0) return false

    const hash = cellHash(col, row)
    const threshold = (hash % 1000) / 1000
    const scatter = (((hash >>> 10) % 1000) / 1000 - 0.5) * colorRippleEdgeNoise * 0.42
    const jitter = Math.sin(driftNow * 0.006 + hash * 0.0037) * colorRippleEdgeNoise * 0.08

    return threshold < clamp01(strength + scatter + jitter)
  }

  function isPersonCell(col: number, row: number) {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return false
    return personCells[cellIndex(col, row)] === 1
  }

  function rebuildPersonCells() {
    personCells = new Uint8Array(cols * rows)
    if (!portraitPixels) return

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sample = samplePortraitCell(col, row)
        if (sample?.isPerson) {
          personCells[cellIndex(col, row)] = 1
        }
      }
    }
  }

  function rebuildRevealGrid() {
    revealGrid = new Uint8Array(cols * rows)
  }

  function hasAnyRevealedCell() {
    for (let i = 0; i < revealGrid.length; i++) {
      if (revealGrid[i] === 1) return true
    }
    return false
  }

  /** Per-cell random threshold (0–1) for noise-style hide dissolve */
  function cellHideThreshold(col: number, row: number) {
    const hash = cellHash(col, row)
    const a = (hash % 997) / 997
    const b = ((hash >>> 11) % 991) / 991
    return a * 0.58 + b * 0.42
  }

  function applyRevealStep() {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = cellIndex(col, row)
        if (!isPersonCell(col, row) || revealGrid[idx] === 1) continue
        if (shouldRevealCell(col, row)) {
          revealGrid[idx] = 1
        }
      }
    }
  }

  function applyHideStep() {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = cellIndex(col, row)
        if (revealGrid[idx] === 0) continue
        if (hideProgress >= cellHideThreshold(col, row)) {
          revealGrid[idx] = 0
        }
      }
    }
  }

  function beginHide() {
    if (!hasAnyRevealedCell()) {
      resetColorInteraction()
      return
    }

    colorMode = 'hide'
    hideProgress = 0
  }

  function beginLongPressReveal(clientX: number, clientY: number) {
    if (!colorPortraitPixels) return

    colorMode = 'reveal'
    rippleOriginX = clientX
    rippleOriginY = clientY
    rippleRadius = 0
    applyRevealStep()
  }

  function cancelPendingLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  /** 1 = letter hidden, 0 = visible; feather zone uses dithered cutoff */
  function cursorVoidMask(col: number, row: number) {
    const cx = col * charWidth + charWidth * 0.5
    const cy = row * charHeight + charHeight * 0.5
    const dx = cx - mouseX
    const dy = cy - mouseY

    const ex = dx / cursorStretchX
    const ey = dy / cursorStretchY
    const dist = Math.hypot(ex, ey)

    const hash = cellHash(col, row)
    const wobble = ((hash % 1000) / 1000 - 0.5) * 2 * cursorEdgeNoise * cursorRadius
    const angleWobble = Math.sin(Math.atan2(dy, dx) * 2.7 + hash * 0.0007) * cursorEdgeNoise * 0.35 * cursorRadius
    const adjustedDist = dist + wobble + angleWobble

    const innerRadius = Math.max(8, cursorRadius - cursorFeather)
    if (adjustedDist >= cursorRadius) return 0
    if (adjustedDist <= innerRadius) return 1

    const edgeT = (adjustedDist - innerRadius) / (cursorRadius - innerRadius)
    return 1 - smoothstep(0, 1, edgeT)
  }

  function isDriftCell(col: number, row: number) {
    return cellHash(col, row) % driftStride === 0
  }

  /** Boost letter drift on person cells awaiting or recovering color, without changing drift cell selection */
  function driftSpeedMultiplier(col: number, row: number) {
    if (!isPersonCell(col, row)) return 1

    const idx = cellIndex(col, row)
    if (revealGrid[idx] === 1) return 1

    if (colorMode === 'reveal') return colorRevealDriftMultiplier
    if (colorMode === 'hide') return colorHideDriftMultiplier

    return 1
  }

  function cellDriftSlot(col: number, row: number, now: number) {
    const hash = cellHash(col, row)
    const phaseMs = (hash >>> 4) % driftIntervalMs
    const jitter = (hash >>> 12) % (driftIntervalJitterMs * 2 + 1) - driftIntervalJitterMs
    const intervalMs = Math.max(120, driftIntervalMs + jitter)
    const speedMult = driftSpeedMultiplier(col, row)

    return Math.floor((now * speedMult + phaseMs) / intervalMs)
  }

  function charForCell(col: number, row: number, now: number) {
    const hash = cellHash(col, row)

    if (!isDriftCell(col, row)) {
      return textPool[hash % textPool.length]
    }

    const slot = cellDriftSlot(col, row, now)
    const index = (hash + slot) % textPool.length
    return textPool[index]
  }

  function shouldHideCell(col: number, row: number) {
    const cx = col * charWidth + charWidth * 0.5
    const cy = row * charHeight + charHeight * 0.5
    const dx = cx - mouseX
    const dy = cy - mouseY
    const effectRadius = cursorRadius + cursorFeather * 0.6

    if (dx * dx + dy * dy >= effectRadius * effectRadius * 1.6) {
      return false
    }

    const mask = cursorVoidMask(col, row)
    if (mask <= 0) return false
    if (mask >= 1) return true

    const threshold = (cellHash(col, row) % 1000) / 1000
    return threshold < mask
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    viewportW = window.innerWidth
    viewportH = window.innerHeight

    canvas.width = Math.floor(viewportW * dpr)
    canvas.height = Math.floor(viewportH * dpr)
    canvas.style.width = `${viewportW}px`
    canvas.style.height = `${viewportH}px`

    mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.ceil(viewportW / charWidth)
    rows = Math.ceil(viewportH / charHeight)
    portraitLayout = computePortraitLayout()
    rebuildRevealGrid()
    rebuildPersonCells()
    resetColorInteraction()
  }

  function render() {
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    mainCtx.fillStyle = backgroundColor
    mainCtx.fillRect(0, 0, width, height)

    mainCtx.font = `${fontWeight} ${fontSize}px "IBM Plex Mono", "JetBrains Mono", "SF Mono", Menlo, monospace`
    mainCtx.textBaseline = 'top'

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = cellIndex(col, row)

        if (revealGrid[idx] === 1) {
          const fill = sampleColorCell(col, row)
          if (fill) {
            mainCtx.fillStyle = fill
            mainCtx.fillRect(col * charWidth, row * charHeight, charWidth, charHeight)
          }
          continue
        }

        if (shouldHideCell(col, row)) continue

        mainCtx.fillStyle = colorForCell(col, row)
        const char = charForCell(col, row, driftNow)
        mainCtx.fillText(char, col * charWidth, row * charHeight)
      }
    }
  }

  function updateColorInteraction(dt: number) {
    if (colorMode === 'reveal') {
      rippleRadius += colorRevealSpeed * dt
      applyRevealStep()
      return
    }

    if (colorMode === 'hide') {
      hideProgress += (colorHideSpeed / 320) * dt
      applyHideStep()
      if (!hasAnyRevealedCell()) {
        resetColorInteraction()
      }
    }
  }

  function onPointerMove(event: PointerEvent) {
    mouseX = event.clientX
    mouseY = event.clientY

    if (longPressTimer !== null) {
      const dx = event.clientX - pressAnchorX
      const dy = event.clientY - pressAnchorY
      if (dx * dx + dy * dy > 14 * 14) {
        cancelPendingLongPress()
      }
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !colorPortraitPixels) return

    mouseX = event.clientX
    mouseY = event.clientY

    const col = Math.floor(event.clientX / charWidth)
    const row = Math.floor(event.clientY / charHeight)
    if (!isPersonCell(col, row)) return

    if (colorMode === 'hide') {
      resetColorInteraction()
    }

    pressAnchorX = event.clientX
    pressAnchorY = event.clientY
    cancelPendingLongPress()

    longPressTimer = setTimeout(() => {
      longPressTimer = null
      beginLongPressReveal(pressAnchorX, pressAnchorY)
    }, longPressMs)
  }

  function onPointerUp(event: PointerEvent) {
    if (event.button !== 0) return

    const wasPending = longPressTimer !== null
    cancelPendingLongPress()

    if (wasPending) return

    if (colorMode === 'reveal') {
      beginHide()
    }
  }

  function onPointerCancel() {
    cancelPendingLongPress()
    if (colorMode === 'reveal') {
      beginHide()
    }
  }

  function onContextMenu(event: Event) {
    if (colorMode !== 'idle' || longPressTimer !== null) {
      event.preventDefault()
    }
  }

  function onResize() {
    resize()
  }

  function tick(now: number) {
    const dt = lastTickNow ? Math.min(0.05, (now - lastTickNow) / 1000) : 0
    lastTickNow = now
    driftNow = now
    updateColorInteraction(dt)
    render()
    animationFrameId = window.requestAnimationFrame(tick)
  }

  let assetsReady = 0
  const assetsNeeded = (image ? 1 : 0) + (colorImage ? 1 : 0)

  function onAssetReady() {
    assetsReady++
    if (assetsReady >= assetsNeeded) {
      portraitLayout = computePortraitLayout()
      rebuildPersonCells()
    }
  }

  if (image && portraitUrl) {
    image.addEventListener('load', () => {
      cachePortraitPixels()
      onAssetReady()
    })
    image.src = portraitUrl
  }

  if (colorImage && portraitColorUrl) {
    colorImage.addEventListener('load', () => {
      cacheColorPortraitPixels()
      onAssetReady()
    })
    colorImage.src = portraitColorUrl
  }

  resize()
  animationFrameId = window.requestAnimationFrame(tick)
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  canvas.addEventListener('contextmenu', onContextMenu)

  return {
    destroy() {
      window.cancelAnimationFrame(animationFrameId)
      cancelPendingLongPress()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('contextmenu', onContextMenu)
    },
  }
}
