import { memo, useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import { readSiteAccentColor } from '../lib/accentColor'
import './TargetCursor.css'

type TargetCursorProps = {
  targetSelector?: string
  spinDuration?: number
  hideDefaultCursor?: boolean
  parallaxOn?: boolean
  cursorColor?: string
}

type CursorRuntime = {
  mouseX: number
  mouseY: number
  cursorX: number
  cursorY: number
  strength: number
  targetStrength: number
  activeTarget: Element | null
  targetCornerPositions: Array<{ x: number; y: number }> | null
  displayedCornerPositions: Array<{ x: number; y: number }>
  suppressLeaveUntil: number
  lastAccent: string
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
) => [
  { x: rect.left - borderWidth - offsetX, y: rect.top - borderWidth - offsetY },
  { x: rect.right + borderWidth - cornerSize - offsetX, y: rect.top - borderWidth - offsetY },
  {
    x: rect.right + borderWidth - cornerSize - offsetX,
    y: rect.bottom + borderWidth - cornerSize - offsetY,
  },
  { x: rect.left - borderWidth - offsetX, y: rect.bottom + borderWidth - cornerSize - offsetY },
]

const isPointerOverTarget = (target: Element, x: number, y: number, selector: string) => {
  const elementUnderMouse = document.elementFromPoint(x, y)
  return (
    elementUnderMouse !== null &&
    (elementUnderMouse === target || elementUnderMouse.closest(selector) === target)
  )
}

export default memo(function TargetCursor({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  parallaxOn = true,
  cursorColor = '#ffffff',
}: TargetCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const spinTl = useRef<gsap.core.Timeline | null>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const cursorColorRef = useRef(cursorColor)
  const isTargetingRef = useRef(false)
  const runtimeRef = useRef<CursorRuntime | null>(null)

  cursorColorRef.current = cursorColor

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
    const restPositions = [
      { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: cornerSize * 0.5 },
      { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
    ]

    const setCornerTransform = corners.map((corner) => {
      return (x: number, y: number) => {
        corner.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    })

    if (!runtimeRef.current) {
      runtimeRef.current = {
        mouseX: window.innerWidth / 2,
        mouseY: window.innerHeight / 2,
        cursorX: 0,
        cursorY: 0,
        strength: 0,
        targetStrength: 0,
        activeTarget: null,
        targetCornerPositions: null,
        displayedCornerPositions: restPositions.map((pos) => ({ ...pos })),
        suppressLeaveUntil: 0,
        lastAccent: readSiteAccentColor(),
      }
    }

    const runtime = runtimeRef.current
    let currentLeaveHandler: EventListener | null = null
    let spinPending = false

    const initialOffset = getOffset()
    runtime.cursorX = runtime.mouseX - initialOffset.x
    runtime.cursorY = runtime.mouseY - initialOffset.y

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: runtime.cursorX,
      y: runtime.cursorY,
      force3D: true,
    })

    restPositions.forEach((pos, i) => {
      setCornerTransform[i](pos.x, pos.y)
    })
    corners.forEach((corner) => {
      corner.style.borderColor = cursorColorRef.current
    })
    if (dotRef.current) {
      dotRef.current.style.backgroundColor = cursorColorRef.current
    }

    const applyTargetColors = (color: string) => {
      corners.forEach((corner) => {
        corner.style.borderColor = color
      })
      if (dotRef.current) {
        dotRef.current.style.backgroundColor = color
      }
      runtime.lastAccent = color
    }

    const refreshTargetCorners = () => {
      if (!runtime.activeTarget) return
      const rect = runtime.activeTarget.getBoundingClientRect()
      const { x: offsetX, y: offsetY } = getOffset()
      runtime.targetCornerPositions = getCornerTargets(
        rect,
        offsetX,
        offsetY,
        borderWidth,
        cornerSize,
      )
    }

    const cleanupTarget = (target: Element) => {
      if (currentLeaveHandler) {
        target.removeEventListener('mouseleave', currentLeaveHandler)
      }
      currentLeaveHandler = null
    }

    const resumeSpin = () => {
      if (!cursorRef.current || runtime.activeTarget) return
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
      if (runtime.activeTarget) {
        cleanupTarget(runtime.activeTarget)
      }
      runtime.activeTarget = null
      runtime.targetCornerPositions = null
      runtime.targetStrength = 0
      isTargetingRef.current = false
      spinPending = true
      applyTargetColors(cursorColorRef.current)
    }

    const assertLock = (target: Element) => {
      runtime.activeTarget = target
      runtime.targetStrength = 1
      runtime.strength = 1
      isTargetingRef.current = true
      spinPending = false
      refreshTargetCorners()
      gsap.killTweensOf(cursor, 'rotation')
      spinTl.current?.pause()
      gsap.set(cursor, { rotation: 0, force3D: true })
      applyTargetColors(readSiteAccentColor(runtime.lastAccent))
    }

    const activateTarget = (target: Element) => {
      if (runtime.activeTarget === target) {
        refreshTargetCorners()
        return
      }

      if (runtime.activeTarget) {
        cleanupTarget(runtime.activeTarget)
      }

      assertLock(target)

      const leaveHandler: EventListener = (event) => {
        const mouseEvent = event as MouseEvent
        if (performance.now() < runtime.suppressLeaveUntil) return
        if (mouseEvent.relatedTarget instanceof Node && target.contains(mouseEvent.relatedTarget)) return
        if (isPointerOverTarget(target, runtime.mouseX, runtime.mouseY, targetSelector)) return
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

    const createSpinTimeline = () => {
      spinTl.current?.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' })
    }

    createSpinTimeline()

    if (runtime.activeTarget && document.contains(runtime.activeTarget)) {
      assertLock(runtime.activeTarget)
      currentLeaveHandler = (event) => {
        const target = runtime.activeTarget
        if (!target) return
        const mouseEvent = event as MouseEvent
        if (performance.now() < runtime.suppressLeaveUntil) return
        if (mouseEvent.relatedTarget instanceof Node && target.contains(mouseEvent.relatedTarget)) return
        if (isPointerOverTarget(target, runtime.mouseX, runtime.mouseY, targetSelector)) return
        cleanupTarget(target)
        deactivateTarget()
      }
      runtime.activeTarget.addEventListener('mouseleave', currentLeaveHandler)
    } else if (runtime.targetStrength === 0) {
      restPositions.forEach((pos, i) => {
        setCornerTransform[i](pos.x, pos.y)
      })
      if (runtime.strength === 0) {
        spinTl.current?.play()
      }
    }

    const tick = () => {
      const dt = gsap.ticker.deltaRatio()
      const { x: offsetX, y: offsetY } = getOffset()

      const targetCursorX = runtime.mouseX - offsetX
      const targetCursorY = runtime.mouseY - offsetY
      const cursorEase = 1 - Math.pow(0.0008, dt)
      runtime.cursorX += (targetCursorX - runtime.cursorX) * cursorEase
      runtime.cursorY += (targetCursorY - runtime.cursorY) * cursorEase
      gsap.set(cursor, { x: runtime.cursorX, y: runtime.cursorY, force3D: true })

      const strengthEase = runtime.targetStrength > runtime.strength ? 0.42 : 0.34
      runtime.strength += (runtime.targetStrength - runtime.strength) * strengthEase * dt
      if (Math.abs(runtime.targetStrength - runtime.strength) < 0.001) {
        runtime.strength = runtime.targetStrength
      }

      if (runtime.activeTarget) {
        refreshTargetCorners()
        const accent = readSiteAccentColor(runtime.lastAccent)
        if (accent !== runtime.lastAccent) {
          applyTargetColors(accent)
        }
      }

      for (let i = 0; i < corners.length; i += 1) {
        let nextX = restPositions[i].x
        let nextY = restPositions[i].y

        if (runtime.targetCornerPositions && runtime.strength > 0) {
          const lockX = runtime.targetCornerPositions[i].x - runtime.cursorX
          const lockY = runtime.targetCornerPositions[i].y - runtime.cursorY
          nextX = restPositions[i].x + (lockX - restPositions[i].x) * runtime.strength
          nextY = restPositions[i].y + (lockY - restPositions[i].y) * runtime.strength
        }

        if (parallaxOn && runtime.strength >= 0.98 && runtime.targetCornerPositions) {
          const parallaxEase = 0.55 * dt
          runtime.displayedCornerPositions[i].x +=
            (nextX - runtime.displayedCornerPositions[i].x) * parallaxEase
          runtime.displayedCornerPositions[i].y +=
            (nextY - runtime.displayedCornerPositions[i].y) * parallaxEase
          nextX = runtime.displayedCornerPositions[i].x
          nextY = runtime.displayedCornerPositions[i].y
        } else {
          runtime.displayedCornerPositions[i].x = nextX
          runtime.displayedCornerPositions[i].y = nextY
        }

        setCornerTransform[i](nextX, nextY)
      }

      if (runtime.targetStrength === 0 && runtime.strength === 0 && spinPending) {
        resumeSpin()
      }
    }

    gsap.ticker.add(tick)

    const moveHandler = (e: MouseEvent) => {
      runtime.mouseX = e.clientX
      runtime.mouseY = e.clientY
    }

    const scrollHandler = () => {
      if (!runtime.activeTarget) return
      refreshTargetCorners()
      if (!isPointerOverTarget(runtime.activeTarget, runtime.mouseX, runtime.mouseY, targetSelector)) {
        if (performance.now() < runtime.suppressLeaveUntil) return
        if (currentLeaveHandler) {
          currentLeaveHandler(new Event('mouseleave'))
        }
      }
    }

    const themeClickHandler = (event: MouseEvent) => {
      const themeButton = (event.target as Element | null)?.closest('.site-theme-button')
      if (!themeButton || !themeButton.matches(targetSelector)) return

      runtime.suppressLeaveUntil = performance.now() + 250
      activateTarget(themeButton)
    }

    const mouseDownHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.12, overwrite: true })
      gsap.to(cursor, { scale: 0.9, duration: 0.1, overwrite: true })
    }

    const mouseUpHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 1, duration: 0.12, overwrite: true })
      gsap.to(cursor, { scale: 1, duration: 0.1, overwrite: true })
    }

    window.addEventListener('mousemove', moveHandler, { passive: true })
    window.addEventListener('mouseover', enterHandler, { passive: true })
    window.addEventListener('click', themeClickHandler, true)
    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('mousedown', mouseDownHandler)
    window.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('resize', scrollHandler, { passive: true })

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('mousemove', moveHandler)
      window.removeEventListener('mouseover', enterHandler)
      window.removeEventListener('click', themeClickHandler, true)
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('mousedown', mouseDownHandler)
      window.removeEventListener('mouseup', mouseUpHandler)
      window.removeEventListener('resize', scrollHandler)
      if (runtime.activeTarget) cleanupTarget(runtime.activeTarget)
      spinTl.current?.kill()
      document.body.style.cursor = originalCursor
    }
  }, [targetSelector, spinDuration, hideDefaultCursor, isMobile, parallaxOn])

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
      <div ref={dotRef} className="target-cursor-dot" />
      <div className="target-cursor-corner corner-tl" />
      <div className="target-cursor-corner corner-tr" />
      <div className="target-cursor-corner corner-br" />
      <div className="target-cursor-corner corner-bl" />
    </div>
  )
})
