import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AsciiInteractiveBackground } from './components/AsciiInteractiveBackground'
import { LoadingScreen } from './components/LoadingScreen'
import { LongPressHint } from './components/LongPressHint'
import { SiteLayout } from './components/SiteLayout'
import TargetCursor from './components/TargetCursor'
import { ROUTER_BASENAME } from './config/site'
import { FuzzyBurstProvider } from './context/FuzzyBurstContext'
import { ACCENT_THEMES } from './content/siteContent'
import { preloadCriticalAssets } from './lib/preloadAssets'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'

/** Force boot UI on screen at least this long (fast networks still see the beat) */
const MIN_BOOT_MS = 3200

function App() {
  const [themeIndex, setThemeIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [bootComplete, setBootComplete] = useState(false)
  const [asciiReady, setAsciiReady] = useState(false)
  const [minBootElapsed, setMinBootElapsed] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [showBoot, setShowBoot] = useState(true)

  const accent = ACCENT_THEMES[themeIndex]
  // Mount shell under boot as soon as preload finishes so ASCII can build portrait
  const shellMounted = assetsReady
  const canReveal = bootComplete && asciiReady && minBootElapsed && shellMounted

  useEffect(() => {
    document.documentElement.classList.add('is-booting')
    const minTimer = window.setTimeout(() => setMinBootElapsed(true), MIN_BOOT_MS)
    let cancelled = false

    preloadCriticalAssets(({ progress: p }) => {
      if (cancelled) return
      flushSync(() => setProgress(p))
    }).then(() => {
      if (!cancelled) setAssetsReady(true)
    })

    return () => {
      cancelled = true
      window.clearTimeout(minTimer)
    }
  }, [])

  useEffect(() => {
    if (!canReveal) return
    // One frame so entering→ready opacity transition can run
    const id = window.requestAnimationFrame(() => setReveal(true))
    return () => window.cancelAnimationFrame(id)
  }, [canReveal])

  useEffect(() => {
    if (showBoot) return
    document.documentElement.classList.remove('is-booting')
  }, [showBoot])

  const handleBootComplete = useCallback(() => {
    setBootComplete(true)
  }, [])

  const handleAsciiReady = useCallback(() => {
    setAsciiReady(true)
  }, [])

  const handleBootExited = useCallback(() => {
    setShowBoot(false)
  }, [])

  const handleCycleTheme = () => {
    flushSync(() => {
      setThemeIndex((current) => (current + 1) % ACCENT_THEMES.length)
    })
  }

  return (
    <>
      {shellMounted && (
        <BrowserRouter basename={ROUTER_BASENAME}>
          <FuzzyBurstProvider accent={accent}>
            <div
              className={`app-shell${
                reveal ? ' app-shell--ready' : ' app-shell--entering'
              }`}
            >
              <AsciiInteractiveBackground onReady={handleAsciiReady} />
              <Routes>
                <Route
                  element={
                    <SiteLayout
                      accent={accent}
                      onCycleTheme={handleCycleTheme}
                    />
                  }
                >
                  <Route index element={<HomePage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                </Route>
              </Routes>
              {reveal && <LongPressHint />}
              {reveal && (
                <TargetCursor
                  spinDuration={2}
                  hideDefaultCursor
                  parallaxOn
                  cursorColorOnTarget={accent}
                />
              )}
            </div>
          </FuzzyBurstProvider>
        </BrowserRouter>
      )}
      {showBoot && (
        <LoadingScreen
          progress={progress}
          assetsReady={assetsReady}
          exiting={reveal}
          onBootComplete={handleBootComplete}
          onExited={handleBootExited}
        />
      )}
    </>
  )
}

export default App
