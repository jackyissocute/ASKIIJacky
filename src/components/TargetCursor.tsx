import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import './TargetCursor.css'

type TargetCursorProps = {
  targetSelector?: string
  spinDuration?: number
  hideDefaultCursor?: boolean
  parallaxOn?: boolean
  cursorColor?: string
  cursorColorOnTarget?: string
}

const getContainingBlock = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node)
    if (
      style.transform !== 'none' ||
      style.perspective !== 'none' ||
      style.filter !== 'none' ||
      style.willChange.includes('transform') ||
      style.willChange.includes('perspective') ||
      style.willChange.includes('filter') ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node
    }
    node = node.parentElement
  }
  return null
}

const getContainingBlockOffset = (block: HTMLElement | null) => {
  if (!block) return { x: 0, y: 0 }
  const rect = block.getBoundingClientRect()
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop }
}

const getCornerTargets = (
  rect: DOMRect,
  offsetX: number,
  offsetY: number,
  borderWidth: number,
  cornerSize: number,
) => {
  const half = cornerSize / 2
  return [
    { x: rect.left - borderWidth - half - offsetX, y: rect.top - borderWidth - half - offsetY },
    { x: rect.right + borderWidth + half - offsetX, y: rect.top - borderWidth - half - offsetY },
    {
      x: rect.right + borderWidth + half - offsetX,
      y: rect.bottom + borderWidth + half - offsetY,
    },
    { x: rect.left - borderWidth - half - offsetX, y: rect.bottom + borderWidth + half - offsetY },
  ]
}

export default function TargetCursor({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  parallaxOn = true,
  cursorColor = '#ffffff',
  cursorColorOnTarget,
}: TargetCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const spinTl = useRef<gsap.core.Timeline | null>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const cursorColorRef = useRef(cursorColor)
  const cursorColorOnTargetRef = useRef(cursorColorOnTarget)
  const isTargetingRef = useRef(false)
  const lastMouseRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  })

  cursorColorRef.current = cursorColor
  cursorColorOnTargetRef.current = cursorColorOnTarget

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth <= 768
    const userAgent = navigator.userAgent || navigator.vendor
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
    return (hasTouchScreen && isSmallScreen) || mobileRegex.test(userAgent.toLowerCase())
  }, [])

  useEffect(() => {
    if (isMobile || !cursorRef.current) return

    const originalCursor = document.body.style.cursor
    if (hideDefaultCursor) {
      document.body.style.cursor = 'none'
    }

    const cursor = cursorRef.current
    const corners = Array.from(cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner'))
    const containingBlock = getContainingBlock(cursor)
    const getOffset = () => getContainingBlockOffset(containingBlock)

    const borderWidth = 3
    const cornerSize = 12
    const cornerSpread = cornerSize
    const restPositions = [
      { x: -cornerSpread, y: -cornerSpread },
      { x: cornerSpread, y: -cornerSpread },
      { x: cornerSpread, y: cornerSpread },
      { x: -cornerSpread, y: cornerSpread },
    ]

    const setCornerTransform = corners.map((corner) => {
      return (x: number, y: number) => {
        corner.style.transform = `translate3d(${x}px, ${y}px, 0) translate3d(-50%, -50%, 0)`
      }
    })

    let mouseX = lastMouseRef.current.x
    let mouseY = lastMouseRef.current.y
    let cursorX = mouseX
    let cursorY = mouseY
    let activeTarget: Element | null = null
    let currentLeaveHandler: (() => void) | null = null
    let targetCornerPositions: Array<{ x: number; y: number }> | null = null
    let strength = 0
    let targetStrength = 0
    let spinPending = false
    let displayedCornerPositions = restPositions.map((pos) => ({ ...pos }))

    const initialOffset = getOffset()
    cursorX = mouseX - initialOffset.x
    cursorY = mouseY - initialOffset.y
    gsap.set(cursor, {
      x: cursorX,
      y: cursorY,
      transformOrigin: '0px 0px',
      force3D: true,
    })

    restPositions.forEach((pos, i) => {
      setCornerTransform[i](pos.x, pos.y)
    })

    const createSpinTimeline = () => {
      spinTl.current?.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' })
    }

    createSpinTimeline()

    const applyTargetColors = (color: string) => {
      corners.forEach((corner) => {
        corner.style.borderColor = color
      })
      if (dotRef.current) {
        dotRef.current.style.backgroundColor = color
      }
    }

    const refreshTargetCorners = () => {
      if (!activeTarget) return
      const rect = activeTarget.getBoundingClientRect()
      const { x: offsetX, y: offsetY } = getOffset()
      targetCornerPositions = getCornerTargets(rect, offsetX, offsetY, borderWidth, cornerSize)
    }

    const cleanupTarget = (target: Element) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler)
      }
      currentLeaveHandler = null
    }

    const resumeSpin = () => {
      if (!cursorRef.current || activeTarget) return
      spinPending = false
      const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number
      const normalizedRotation = currentRotation % 360
      spinTl.current?.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' })
      gsap.to(cursorRef.current, {
        rotation: normalizedRotation + 360,
        duration: spinDuration * (1 - normalizedRotation / 360),
        ease: 'none',
        onComplete: () => {
          spinTl.current?.restart()
        },
      })
    }

    const deactivateTarget = () => {
      activeTarget = null
      targetCornerPositions = null
      targetStrength = 0
      isTargetingRef.current = false
      spinPending = true
      applyTargetColors(cursorColorRef.current)
    }

    const activateTarget = (target: Element) => {
      if (activeTarget === target) {
        refreshTargetCorners()
        return
      }

      if (activeTarget) {
        cleanupTarget(activeTarget)
      }

      spinPending = false
      activeTarget = target
      targetStrength = 1
      refreshTargetCorners()
      isTargetingRef.current = true

      gsap.killTweensOf(cursor, 'rotation')
      spinTl.current?.pause()
      gsap.set(cursor, { rotation: 0, force3D: true })

      if (cursorColorOnTargetRef.current) {
        applyTargetColors(cursorColorOnTargetRef.current)
      }

      const leaveHandler = () => {
        cleanupTarget(target)
        deactivateTarget()
      }

      currentLeaveHandler = leaveHandler
      target.addEventListener('mouseleave', leaveHandler)
    }

    const enterHandler = (e: MouseEvent) => {
      const directTarget = e.target
      if (!(directTarget instanceof Element)) return

      let current: Element | null = directTarget
      while (current && current !== document.body) {
        if (current.matches(targetSelector)) {
          activateTarget(current)
          return
        }
        current = current.parentElement
      }
    }

    const tick = () => {
      const dt = gsap.ticker.deltaRatio()
      const { x: offsetX, y: offsetY } = getOffset()

      const targetCursorX = mouseX - offsetX
      const targetCursorY = mouseY - offsetY
      const cursorEase = 1 - Math.pow(0.0008, dt)
      cursorX += (targetCursorX - cursorX) * cursorEase
      cursorY += (targetCursorY - cursorY) * cursorEase
      gsap.set(cursor, { x: cursorX, y: cursorY, force3D: true })

      const strengthEase = targetStrength > strength ? 0.42 : 0.34
      strength += (targetStrength - strength) * strengthEase * dt
      if (Math.abs(targetStrength - strength) < 0.001) {
        strength = targetStrength
      }

      for (let i = 0; i < corners.length; i += 1) {
        let nextX = restPositions[i].x
        let nextY = restPositions[i].y

        if (targetCornerPositions && strength > 0) {
          const lockX = targetCornerPositions[i].x - cursorX
          const lockY = targetCornerPositions[i].y - cursorY
          nextX = restPositions[i].x + (lockX - restPositions[i].x) * strength
          nextY = restPositions[i].y + (lockY - restPositions[i].y) * strength
        }

        if (parallaxOn && strength >= 0.98 && targetCornerPositions) {
          const parallaxEase = 0.55 * dt
          displayedCornerPositions[i].x += (nextX - displayedCornerPositions[i].x) * parallaxEase
          displayedCornerPositions[i].y += (nextY - displayedCornerPositions[i].y) * parallaxEase
          nextX = displayedCornerPositions[i].x
          nextY = displayedCornerPositions[i].y
        } else {
          displayedCornerPositions[i].x = nextX
          displayedCornerPositions[i].y = nextY
        }

        setCornerTransform[i](nextX, nextY)
      }

      if (targetStrength === 0 && strength === 0 && spinPending) {
        resumeSpin()
      }
    }

    gsap.ticker.add(tick)

    const moveHandler = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const scrollHandler = () => {
      if (!activeTarget || !cursorRef.current) return
      refreshTargetCorners()
      const { x: offsetX, y: offsetY } = getOffset()
      const pointerX = (gsap.getProperty(cursorRef.current, 'x') as number) + offsetX
      const pointerY = (gsap.getProperty(cursorRef.current, 'y') as number) + offsetY
      const elementUnderMouse = document.elementFromPoint(pointerX, pointerY)
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === activeTarget ||
          elementUnderMouse.closest(targetSelector) === activeTarget)
      if (!isStillOverTarget && currentLeaveHandler) {
        currentLeaveHandler()
      }
    }

    const mouseDownHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.12, overwrite: 'auto' })
      gsap.to(cursor, { scale: 0.9, duration: 0.1, overwrite: 'auto' })
    }

    const mouseUpHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 1, duration: 0.12, overwrite: 'auto' })
      gsap.to(cursor, { scale: 1, duration: 0.1, overwrite: 'auto' })
      if (!activeTarget) {
        const hasRotationTween = gsap.getTweensOf(cursor).some((tween) => {
          const vars = tween.vars as { rotation?: unknown }
          return vars.rotation !== undefined
        })
        if (!hasRotationTween) {
          resumeSpin()
        }
      }
    }

    window.addEventListener('mousemove', moveHandler, { passive: true })
    window.addEventListener('mouseover', enterHandler, { passive: true })
    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('mousedown', mouseDownHandler)
    window.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('resize', scrollHandler, { passive: true })

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('mousemove', moveHandler)
      window.removeEventListener('mouseover', enterHandler)
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('mousedown', mouseDownHandler)
      window.removeEventListener('mouseup', mouseUpHandler)
      window.removeEventListener('resize', scrollHandler)
      if (activeTarget) cleanupTarget(activeTarget)
      spinTl.current?.kill()
      document.body.style.cursor = originalCursor
    }
  }, [targetSelector, spinDuration, hideDefaultCursor, isMobile, parallaxOn])

  useEffect(() => {
    if (isMobile || !cursorRef.current || !isTargetingRef.current || !cursorColorOnTarget) return

    const corners = cursorRef.current.querySelectorAll<HTMLDivElement>('.target-cursor-corner')
    corners.forEach((corner) => {
      corner.style.borderColor = cursorColorOnTarget
    })
    if (dotRef.current) {
      dotRef.current.style.backgroundColor = cursorColorOnTarget
    }
  }, [cursorColorOnTarget, isMobile])

  useEffect(() => {
    if (isMobile || !cursorRef.current || !spinTl.current) return
    if (spinTl.current.isActive()) {
      spinTl.current.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' })
    }
  }, [spinDuration, isMobile])

  if (isMobile) return null

  return (
    <div ref={cursorRef} className="target-cursor-wrapper">
      <div ref={dotRef} className="target-cursor-dot" style={{ backgroundColor: cursorColor }} />
      <div className="target-cursor-corner corner-tl" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-tr" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-br" style={{ borderColor: cursorColor }} />
      <div className="target-cursor-corner corner-bl" style={{ borderColor: cursorColor }} />
    </div>
  )
}
