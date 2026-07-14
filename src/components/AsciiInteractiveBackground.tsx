import { useEffect, useRef } from 'react'
import { createAsciiBackground } from '../lib/asciiBackground'
import { PUBLIC_ASSETS } from '../config/site'
import { repoAsset } from '../lib/repoAsset'

type AsciiInteractiveBackgroundProps = {
  /** Fires when ASCII portrait silhouette is built (or immediately if no portrait) */
  onReady?: () => void
}

export function AsciiInteractiveBackground({
  onReady,
}: AsciiInteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const controller = createAsciiBackground(canvas, {
      fontSize: 10,
      charWidth: 7,
      charHeight: 12,
      backgroundColor: '#1a1a1a',
      textColor: '#3d3d3d',
      portraitUrl: repoAsset(PUBLIC_ASSETS.portraitLuminance),
      portraitColorUrl: repoAsset(PUBLIC_ASSETS.portraitColor),
      portraitAlphaThreshold: 10,
      portraitAlign: 'right',
      portraitHeightRatio: 0.95,
      portraitHighlightGain: 1.0,
      driftIntervalMs: 400,
      driftIntervalJitterMs: 160,
      driftStride: 48,
      cursorRadius: 88,
      cursorFeather: 54,
      cursorEdgeNoise: 0.2,
      cursorStretchX: 1.06,
      cursorStretchY: 0.9,
      colorRippleEdgeNoise: 0.34,
      colorRippleFeather: 78,
      colorRippleStretchX: 1.1,
      colorRippleStretchY: 0.88,
      colorRevealDriftMultiplier: 2.4,
      fontWeight: 600,
      onPortraitReady: () => onReadyRef.current?.(),
    })

    return () => controller.destroy()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="ascii-bg"
    />
  )
}
