import { useEffect, useMemo, useRef } from 'react'
import { gsap } from 'gsap'
import './TargetCursor.css'

type TargetCursorProps = {
  targetSelector?: string
  spinDuration?: number
  hideDefaultCursor?: boolean
  hoverDuration?: number
  parallaxOn?: boolean
  cursorColor?: string
  cursorColorOnTarget?: string
  /** Extra px around targets where lock-on begins (magnetic pull) */
  attractionRadius?: number
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

const distanceToRect = (x: number, y: number, rect: DOMRect, padding: number) => {
  const left = rect.left - padding
  const right = rect.right + padding
  const top = rect.top - padding
  const bottom = rect.bottom + padding
  const dx = x < left ? left - x : x > right ? x - right : 0
  const dy = y < top ? top - y : y > bottom ? y - bottom : 0
  return Math.hypot(dx, dy)
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

export default function TargetCursor({
  targetSelector = '.cursor-target',
  spinDuration = 2,
  hideDefaultCursor = true,
  hoverDuration = 0.12,
  parallaxOn = true,
  cursorColor = '#ffffff',
  cursorColorOnTarget,
  attractionRadius = 56,
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
    const restPositions = [
      { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
      { x: cornerSize * 0.5, y: cornerSize * 0.5 },
      { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
    ]

    const setCursorX = gsap.quickSetter(cursor, 'x', 'px')
    const setCursorY = gsap.quickSetter(cursor, 'y', 'px')
    const setCornerX = corners.map((corner) => gsap.quickSetter(corner, 'x', 'px'))
    const setCornerY = corners.map((corner) => gsap.quickSetter(corner, 'y', 'px'))

    let mouseX = lastMouseRef.current.x
    let mouseY = lastMouseRef.current.y
    let cursorX = mouseX
    let cursorY = mouseY
    let activeTarget: Element | null = null
    let targetCornerPositions: Array<{ x: number; y: number }> | null = null
    let strength = 0
    let strengthTween: gsap.core.Tween | null = null
    let resumeTimeout: ReturnType<typeof setTimeout> | null = null
    let cornerCache = restPositions.map((pos) => ({ ...pos }))

    const initialOffset = getOffset()
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: mouseX - initialOffset.x,
      y: mouseY - initialOffset.y,
    })
    cursorX = mouseX - initialOffset.x
    cursorY = mouseY - initialOffset.y

    corners.forEach((corner, i) => {
      gsap.set(corner, restPositions[i])
    })

    const createSpinTimeline = () => {
      spinTl.current?.kill()
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' })
    }

    createSpinTimeline()

    const applyTargetColors = (color: string) => {
      gsap.to(corners, { borderColor: color, duration: 0.12, ease: 'power2.out', overwrite: 'auto' })
      if (dotRef.current) {
        gsap.to(dotRef.current, {
          backgroundColor: color,
          duration: 0.12,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      }
    }

    const refreshTargetCorners = () => {
      if (!activeTarget) return
      const rect = activeTarget.getBoundingClientRect()
      const { x: offsetX, y: offsetY } = getOffset()
      targetCornerPositions = getCornerTargets(rect, offsetX, offsetY, borderWidth, cornerSize)
    }

    const applyCornerPositions = () => {
      if (!targetCornerPositions || strength <= 0) {
        corners.forEach((_, i) => {
          setCornerX[i](cornerCache[i].x)
          setCornerY[i](cornerCache[i].y)
        })
        return
      }

      const parallax = parallaxOn && strength >= 0.95 ? 0.38 : 1
      const blend = strength * parallax

      corners.forEach((_, i) => {
        const targetX = targetCornerPositions![i].x - cursorX
        const targetY = targetCornerPositions![i].y - cursorY
        const nextX = restPositions[i].x + (targetX - restPositions[i].x) * strength
        const nextY = restPositions[i].y + (targetY - restPositions[i].y) * strength

        if (parallaxOn && strength >= 0.95) {
          cornerCache[i].x += (nextX - cornerCache[i].x) * blend
          cornerCache[i].y += (nextY - cornerCache[i].y) * blend
        } else {
          cornerCache[i].x = nextX
          cornerCache[i].y = nextY
        }

        setCornerX[i](cornerCache[i].x)
        setCornerY[i](cornerCache[i].y)
      })
    }

    const findNearestTarget = (x: number, y: number, radius: number) => {
      const candidates = document.querySelectorAll<HTMLElement>(targetSelector)
      let nearest: Element | null = null
      let nearestDistance = radius

      candidates.forEach((candidate) => {
        const distance = distanceToRect(x, y, candidate.getBoundingClientRect(), 0)
        if (distance <= nearestDistance) {
          nearestDistance = distance
          nearest = candidate
        }
      })

      return nearest
    }

    const resumeSpin = () => {
      if (!cursorRef.current || !spinTl.current) return
      const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number
      const normalizedRotation = currentRotation % 360
      spinTl.current.kill()
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
      strengthTween?.kill()
      activeTarget = null
      targetCornerPositions = null
      isTargetingRef.current = false

      applyTargetColors(cursorColorRef.current)

      strengthTween = gsap.to(
        { value: strength },
        {
          value: 0,
          duration: hoverDuration,
          ease: 'power2.inOut',
          onUpdate() {
            strength = this.targets()[0].value
            applyCornerPositions()
          },
          onComplete() {
            strength = 0
            cornerCache = restPositions.map((pos) => ({ ...pos }))
            applyCornerPositions()
            resumeTimeout = setTimeout(() => {
              if (!activeTarget) resumeSpin()
              resumeTimeout = null
            }, 40)
          },
        },
      )
    }

    const activateTarget = (target: Element) => {
      if (activeTarget === target) {
        refreshTargetCorners()
        return
      }

      if (activeTarget) {
        strengthTween?.kill()
        strength = 0
      }

      if (resumeTimeout) {
        clearTimeout(resumeTimeout)
        resumeTimeout = null
      }

      activeTarget = target
      refreshTargetCorners()
      cornerCache = restPositions.map((pos) => ({ ...pos }))
      isTargetingRef.current = true

      gsap.killTweensOf(cursor, 'rotation')
      spinTl.current?.pause()
      gsap.set(cursor, { rotation: 0 })

      if (cursorColorOnTargetRef.current) {
        applyTargetColors(cursorColorOnTargetRef.current)
      }

      strengthTween = gsap.to(
        { value: strength },
        {
          value: 1,
          duration: hoverDuration,
          ease: 'power2.out',
          onUpdate() {
            strength = this.targets()[0].value
            applyCornerPositions()
          },
        },
      )
    }

    const updateProximityTarget = (x: number, y: number) => {
      if (activeTarget) {
        const detachDistance = attractionRadius + 12
        const distance = distanceToRect(
          x,
          y,
          activeTarget.getBoundingClientRect(),
          0,
        )
        if (distance <= detachDistance) {
          refreshTargetCorners()
          return
        }
        deactivateTarget()
        return
      }

      const nearest = findNearestTarget(x, y, attractionRadius)
      if (nearest) {
        activateTarget(nearest)
      }
    }

    const tick = () => {
      const { x: offsetX, y: offsetY } = getOffset()
      cursorX += (mouseX - offsetX - cursorX) * 0.55
      cursorY += (mouseY - offsetY - cursorY) * 0.55
      setCursorX(cursorX)
      setCursorY(cursorY)
      applyCornerPositions()
    }

    gsap.ticker.add(tick)

    const moveHandler = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      updateProximityTarget(e.clientX, e.clientY)
    }

    const scrollHandler = () => {
      if (activeTarget) refreshTargetCorners()
    }

    const mouseDownHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 0.7, duration: 0.2 })
      gsap.to(cursor, { scale: 0.9, duration: 0.15 })
    }

    const mouseUpHandler = () => {
      if (!dotRef.current) return
      gsap.to(dotRef.current, { scale: 1, duration: 0.2 })
      gsap.to(cursor, { scale: 1, duration: 0.15 })
    }

    window.addEventListener('mousemove', moveHandler, { passive: true })
    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('mousedown', mouseDownHandler)
    window.addEventListener('mouseup', mouseUpHandler)
    window.addEventListener('resize', scrollHandler, { passive: true })

    return () => {
      gsap.ticker.remove(tick)
      strengthTween?.kill()
      window.removeEventListener('mousemove', moveHandler)
      window.removeEventListener('scroll', scrollHandler)
      window.removeEventListener('mousedown', mouseDownHandler)
      window.removeEventListener('mouseup', mouseUpHandler)
      window.removeEventListener('resize', scrollHandler)
      if (resumeTimeout) clearTimeout(resumeTimeout)
      spinTl.current?.kill()
      document.body.style.cursor = originalCursor
    }
  }, [
    targetSelector,
    spinDuration,
    hideDefaultCursor,
    isMobile,
    hoverDuration,
    parallaxOn,
    attractionRadius,
  ])

  useEffect(() => {
    if (isMobile || !cursorRef.current || !isTargetingRef.current || !cursorColorOnTarget) return

    const corners = cursorRef.current.querySelectorAll<HTMLDivElement>('.target-cursor-corner')
    gsap.to(corners, {
      borderColor: cursorColorOnTarget,
      duration: 0.12,
      ease: 'power2.out',
      overwrite: 'auto',
    })
    if (dotRef.current) {
      gsap.to(dotRef.current, {
        backgroundColor: cursorColorOnTarget,
        duration: 0.12,
        ease: 'power2.out',
        overwrite: 'auto',
      })
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
