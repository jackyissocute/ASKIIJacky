import { useEffect, useRef } from 'react'
import { createAsciiBackground } from '../lib/asciiBackground'

export function AsciiInteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const controller = createAsciiBackground(canvas, {
      fontSize: 10,
      charWidth: 7,
      charHeight: 12,
      backgroundColor: '#1a1a1a',
      textColor: '#3d3d3d',
      portraitUrl: `${import.meta.env.BASE_URL}jacky-lin.png`,
      portraitColorUrl: `${import.meta.env.BASE_URL}jacky-lin-color.png`,
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
      fontWeight: 600,
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
