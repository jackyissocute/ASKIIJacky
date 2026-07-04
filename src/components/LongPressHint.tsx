import { useEffect, useState } from 'react'
import {
  ASCII_PERSON_HOVER_EVENT,
  type AsciiPersonHoverDetail,
} from '../lib/asciiPersonHover'

export function LongPressHint() {
  const [hint, setHint] = useState<AsciiPersonHoverDetail | null>(null)

  useEffect(() => {
    const onPersonHover = (event: Event) => {
      const detail = (event as CustomEvent<AsciiPersonHoverDetail>).detail
      setHint(detail.active ? detail : null)
    }

    window.addEventListener(ASCII_PERSON_HOVER_EVENT, onPersonHover as EventListener)

    return () => {
      window.removeEventListener(ASCII_PERSON_HOVER_EVENT, onPersonHover as EventListener)
    }
  }, [])

  if (!hint) return null

  return (
    <p
      className="long-press-hint"
      style={{ left: hint.x, top: hint.y }}
      aria-hidden="true"
    >
      {hint.label}
    </p>
  )
}
