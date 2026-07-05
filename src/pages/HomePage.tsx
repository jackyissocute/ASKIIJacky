import { aboutContent, projectsContent } from '../content/siteContent'
import { ProjectList } from '../components/ProjectList'
import { AccentFuzzyHeading } from '../components/AccentFuzzyHeading'

export function HomePage() {
  const previewProjects = projectsContent.items.slice(0, projectsContent.homePreviewCount)

  return (
    <div className="site-card site-body">
      <div className="site-body-scroll">
        <section className="site-about">
          <AccentFuzzyHeading text="about" />

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

            <p className="site-body-text">{aboutContent.footer}</p>
          </div>
        </section>

        <ProjectList
          projects={previewProjects}
          variant="preview"
          viewAllHref={projectsContent.viewAllHref}
        />
      </div>
    </div>
  )
}
