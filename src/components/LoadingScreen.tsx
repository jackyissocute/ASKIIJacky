import { useEffect, useRef, useState } from 'react'

export const BOOT_EXIT_MS = 900

const BAR_WIDTH = 10
/** Real progress threshold that starts the humor typewriter — bar does not pause here */
const TEXT_AT = 0.8
const ELLIPSIS_MS = 420
const TYPE_MS = 34
const BLINK_MS = 90
const ERROR_TEXT = 'ERROR: “Sense of humor” not found'
const HINT_TEXT = 'Reboot me with coffee or memes'

type Phase = 'loading' | 'typing' | 'done'

type LoadingScreenProps = {
  /** 0–1 real preload progress — bar mirrors this exactly */
  progress: number
  /** True when all critical assets are decoded */
  assetsReady: boolean
  exiting: boolean
  /** Fires after blink ×3 AND assetsReady (may wait at 100% for either) */
  onBootComplete: () => void
  onExited?: () => void
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function LoadingScreen({
  progress,
  assetsReady,
  exiting,
  onBootComplete,
  onExited,
}: LoadingScreenProps) {
  const [dots, setDots] = useState(1)
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorTyped, setErrorTyped] = useState('')
  const [hintTyped, setHintTyped] = useState('')
  const [showErrorLine, setShowErrorLine] = useState(false)
  const [showHintLine, setShowHintLine] = useState(false)
  const [hintBlinkOn, setHintBlinkOn] = useState(true)

  const completedRef = useRef(false)
  const typingStartedRef = useRef(false)
  const bootCompleteRef = useRef(onBootComplete)
  bootCompleteRef.current = onBootComplete

  // Bar === real progress. No freeze, no fake charge, no link to text beat.
  const ratio = Math.min(1, Math.max(0, progress))
  const pct = Math.round(ratio * 100)
  const filled = Math.min(BAR_WIDTH, Math.round(ratio * BAR_WIDTH))

  useEffect(() => {
    if (phase !== 'loading') {
      setDots(3)
      return
    }
    const id = window.setInterval(() => {
      setDots((d) => (d % 3) + 1)
    }, ELLIPSIS_MS)
    return () => window.clearInterval(id)
  }, [phase])

  // 80% real progress starts the humor typewriter (bar keeps moving independently)
  useEffect(() => {
    if (typingStartedRef.current) return
    if (progress < TEXT_AT) return
    typingStartedRef.current = true
    setPhase('typing')
  }, [progress])

  useEffect(() => {
    if (phase !== 'typing') return
    let cancelled = false

    ;(async () => {
      setShowErrorLine(true)
      setErrorTyped('')
      for (let i = 1; i <= ERROR_TEXT.length; i++) {
        if (cancelled) return
        setErrorTyped(ERROR_TEXT.slice(0, i))
        await sleep(TYPE_MS)
      }

      await sleep(220)
      if (cancelled) return

      setShowHintLine(true)
      setHintTyped('')
      for (let i = 1; i <= HINT_TEXT.length; i++) {
        if (cancelled) return
        setHintTyped(HINT_TEXT.slice(0, i))
        await sleep(TYPE_MS)
      }

      for (let i = 0; i < 3; i++) {
        if (cancelled) return
        setHintBlinkOn(false)
        await sleep(BLINK_MS)
        setHintBlinkOn(true)
        await sleep(BLINK_MS)
      }

      if (cancelled) return
      setPhase('done')
    })()

    return () => {
      cancelled = true
    }
  }, [phase])

  // Leave boot when blink finished AND assets at 100%
  useEffect(() => {
    if (phase !== 'done' || !assetsReady || completedRef.current) return
    completedRef.current = true
    bootCompleteRef.current()
  }, [phase, assetsReady])

  useEffect(() => {
    if (!exiting || !onExited) return
    const id = window.setTimeout(onExited, BOOT_EXIT_MS)
    return () => window.clearTimeout(id)
  }, [exiting, onExited])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById('boot-static')?.remove()
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className={`boot-screen${exiting ? ' boot-screen--exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={`Loading personality ${pct}%`}
    >
      <pre className="boot-screen__panel">
        <span className="boot-screen__line">
          <span className="boot-screen__glyph" aria-hidden="true">
            ᩭᘏᗢ
          </span>
          <span className="boot-screen__text">
            Loading personality
            <span className="boot-screen__ellipsis" aria-hidden="true">
              {'.'.repeat(dots)}
            </span>
          </span>
        </span>
        <span className="boot-screen__line boot-screen__line--bar">
          <span className="boot-screen__bracket">[</span>
          <span className="boot-screen__bar-fill">{'■'.repeat(filled)}</span>
          <span className="boot-screen__bar-empty">
            {'□'.repeat(BAR_WIDTH - filled)}
          </span>
          <span className="boot-screen__bracket">]</span>{' '}
          <span className="boot-screen__pct">{pct}%</span>
        </span>
        {(showErrorLine || showHintLine) && (
          <span className="boot-screen__error" aria-live="assertive">
            {showErrorLine && (
              <span className="boot-screen__line boot-screen__line--error">
                <span className="boot-screen__glyph" aria-hidden="true">
                  ⚠️
                </span>
                <span className="boot-screen__text">
                  {errorTyped}
                  {errorTyped.length < ERROR_TEXT.length && (
                    <span className="boot-screen__caret" aria-hidden="true">
                      ▌
                    </span>
                  )}
                </span>
              </span>
            )}
            {showHintLine && (
              <span
                className={`boot-screen__line boot-screen__line--hint${
                  hintBlinkOn ? '' : ' boot-screen__line--blink-off'
                }`}
              >
                <span className="boot-screen__glyph" aria-hidden="true">
                  🎮
                </span>
                <span className="boot-screen__text">
                  {hintTyped}
                  {hintTyped.length < HINT_TEXT.length && (
                    <span className="boot-screen__caret" aria-hidden="true">
                      ▌
                    </span>
                  )}
                </span>
              </span>
            )}
          </span>
        )}
      </pre>
    </div>
  )
}
