import { useState } from 'react'
import { flushSync } from 'react-dom'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AsciiInteractiveBackground } from './components/AsciiInteractiveBackground'
import { LongPressHint } from './components/LongPressHint'
import { SiteLayout } from './components/SiteLayout'
import TargetCursor from './components/TargetCursor'
import { ROUTER_BASENAME } from './config/site'
import { FuzzyBurstProvider } from './context/FuzzyBurstContext'
import { ACCENT_THEMES } from './content/siteContent'
import { HomePage } from './pages/HomePage'
import { ProjectsPage } from './pages/ProjectsPage'

function App() {
  const [themeIndex, setThemeIndex] = useState(0)
  const accent = ACCENT_THEMES[themeIndex]

  const handleCycleTheme = () => {
    flushSync(() => {
      setThemeIndex((current) => (current + 1) % ACCENT_THEMES.length)
    })
  }

  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <FuzzyBurstProvider accent={accent}>
        <div className="app-shell">
          <AsciiInteractiveBackground />
          <Routes>
            <Route
              element={
                <SiteLayout accent={accent} onCycleTheme={handleCycleTheme} />
              }
            >
              <Route index element={<HomePage />} />
              <Route path="projects" element={<ProjectsPage />} />
            </Route>
          </Routes>
          <LongPressHint />
          <TargetCursor
            spinDuration={2}
            hideDefaultCursor
            parallaxOn
            cursorColorOnTarget={accent}
          />
        </div>
      </FuzzyBurstProvider>
    </BrowserRouter>
  )
}

export default App
