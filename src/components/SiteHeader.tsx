import { Link, useLocation } from 'react-router-dom'
import { PUBLIC_ASSETS } from '../config/site'
import { useFuzzyBurst } from '../context/FuzzyBurstContext'
import { repoAsset } from '../lib/repoAsset'
import { siteProfile } from '../content/siteContent'
import { AccentFuzzyHeading } from './AccentFuzzyHeading'
import {
  DiscordIcon,
  EmailIcon,
  GitHubIcon,
  LinkedInIcon,
  XIcon,
} from './icons/SocialIcons'

const socialIconMap = {
  github: GitHubIcon,
  email: EmailIcon,
  discord: DiscordIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
} as const

function SocialLinks({
  size = 22,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <>
      {siteProfile.social.map(({ label, href, icon }) => {
        const Icon = socialIconMap[icon]
        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`cursor-target ${className ?? ''}`.trim()}
            aria-label={label}
          >
            <Icon size={size} />
          </a>
        )
      })}
    </>
  )
}

type SiteHeaderProps = {
  accent: string
  onCycleTheme: () => void
}

function isNavActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname.startsWith(href)
}

export function SiteHeader({ accent, onCycleTheme }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const { triggerBurst } = useFuzzyBurst()

  return (
    <header className="site-card site-header">
      <img
        alt={siteProfile.avatarAlt}
        className="site-avatar cursor-target"
        src={repoAsset(PUBLIC_ASSETS.profilePhoto)}
      />

      <div className="site-header-copy">
        <div className="site-name-wrap">
          <AccentFuzzyHeading text={siteProfile.name} className="site-name" />
        </div>

        <nav className="site-nav" aria-label="Primary">
          {siteProfile.nav.map(({ label, href }) => {
            const active = isNavActive(pathname, href)

            return (
              <Link
                key={label}
                to={href}
                className={
                  active
                    ? 'site-nav-link site-nav-link-active cursor-target'
                    : 'site-nav-link cursor-target'
                }
                onPointerDown={() => {
                  if (!active) {
                    triggerBurst()
                  }
                }}
              >
                {label}
              </Link>
            )
          })}
          <button
            type="button"
            className="site-theme-button cursor-target"
            aria-label="Cycle theme"
            onMouseDown={(event) => {
              event.preventDefault()
              onCycleTheme()
              triggerBurst()
            }}
          >
            {accent}
          </button>
        </nav>
      </div>

      <div className="site-header-actions">
        <div className="site-social-grid">
          <SocialLinks className="site-social-link" />
        </div>
        <a
          href={repoAsset(PUBLIC_ASSETS.resume)}
          target="_blank"
          rel="noopener noreferrer"
          className="site-resume-link cursor-target"
        >
          resume <span className="site-arrow">→</span>
        </a>
      </div>
    </header>
  )
}
