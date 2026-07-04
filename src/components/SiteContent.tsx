import { PUBLIC_ASSETS } from '../config/site'
import { repoAsset } from '../lib/repoAsset'
import {
  aboutContent,
  projectsContent,
  siteProfile,
} from '../content/siteContent'
import { SplitHeading } from './SplitHeading'
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

type SiteContentProps = {
  accent: string
  onCycleTheme: () => void
}

export function SiteContent({ accent, onCycleTheme }: SiteContentProps) {
  return (
    <main className="site-main" style={{ ['--color-accent' as string]: accent }}>
      <header className="site-card site-header">
        <img
          alt={siteProfile.avatarAlt}
          className="site-avatar cursor-target"
          src={repoAsset(PUBLIC_ASSETS.profilePhoto)}
        />

        <div className="site-header-copy">
          <div className="site-name-wrap">
            <SplitHeading text={siteProfile.name} className="site-heading site-name" />
          </div>

          <nav className="site-nav" aria-label="Primary">
            {siteProfile.nav.map(({ label, href, active }) => (
              <a
                key={label}
                href={href}
                className={
                  active
                    ? 'site-nav-link site-nav-link-active cursor-target'
                    : 'site-nav-link cursor-target'
                }
              >
                {label}
              </a>
            ))}
            <button
              type="button"
              className="site-theme-button cursor-target"
              aria-label="Cycle theme"
              onClick={onCycleTheme}
            >
              <span className="site-theme-button-label" aria-hidden="true" />
            </button>
          </nav>
        </div>

        <div className="site-header-actions">
          <div className="site-social-grid">
            <SocialLinks className="site-social-link" />
          </div>
          <a
            href={siteProfile.resumeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="site-resume-link cursor-target"
          >
            resume <span className="site-arrow">→</span>
          </a>
        </div>
      </header>

      <div className="site-card site-body">
        <div className="site-body-scroll">
          <section className="site-about">
            <SplitHeading text="about" className="site-heading" />

            <div className="site-about-copy">
              {aboutContent.paragraphs.map((paragraph) => (
                <p key={paragraph.lines.join('-')} className="site-body-text">
                  {paragraph.lines.map((line, index) => (
                    <span key={line}>
                      {line}
                      {index < paragraph.lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              ))}

              <div className="site-about-footer">
                <p className="site-body-text">{aboutContent.footer}</p>
                <div className="site-social-grid site-social-grid-mobile">
                  <SocialLinks size={20} className="site-social-link site-social-link-accent" />
                </div>
              </div>
            </div>
          </section>

          <section className="site-projects">
            <div className="site-projects-header">
              <SplitHeading text="projects" className="site-heading" />
              <a href={projectsContent.viewAllHref} className="site-view-all cursor-target">
                view all <span className="site-arrow">→</span>
              </a>
            </div>

            <div className="site-project-list">
              {projectsContent.items.map((project) => (
                <article key={project.name} className="site-project">
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="site-project-link cursor-target"
                  >
                    <div className="site-project-title-row">
                      <h3 className="site-project-name">{project.name}</h3>
                      <p className="site-project-language">{project.language}</p>
                    </div>
                    <p className="site-project-description">{project.description}</p>
                  </a>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
