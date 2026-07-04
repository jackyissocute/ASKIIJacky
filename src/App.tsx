import { useState } from 'react'
import { AsciiInteractiveBackground } from './components/AsciiInteractiveBackground'
import { SiteContent } from './components/SiteContent'
import TargetCursor from './components/TargetCursor'
import { ACCENT_THEMES } from './content/siteContent'

function App() {
  const [themeIndex, setThemeIndex] = useState(0)
  const accent = ACCENT_THEMES[themeIndex]

  return (
    <div className="app-shell">
      <AsciiInteractiveBackground />
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.12}
        attractionRadius={64}
        cursorColorOnTarget={accent}
      />
      <SiteContent
        accent={accent}
        onCycleTheme={() => setThemeIndex((current) => (current + 1) % ACCENT_THEMES.length)}
      />
    </div>
  )
}

export default App
