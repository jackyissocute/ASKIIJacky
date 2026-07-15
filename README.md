# hellojacky

Jacky Lin's ultimate personal website — a single home for research, projects, and contact.

**Live site:** [jackyissocute.github.io/hellojacky](https://jackyissocute.github.io/hellojacky/)

## About

I'm Jacky Lin, a Duke Kunshan / Duke University undergraduate (Class of 2027) working across molecular bioscience, biophysics, medical physics, protein engineering, and AI-assisted research tooling.

This site is my primary web presence: a place to share who I am, what I'm building, and how to reach me. It combines a minimal portfolio layout with an interactive ASCII portrait background, custom cursor interactions, and a downloadable resume.

## What's on the site

- **Home** — short bio, featured projects, and a Feynman quote footer
- **Projects** — research and coding work, including LiSPER, supplier doc intelligence, and DEK supercoiling
- **Resume** — one-page PDF download from the header (`resume →`)
- **Social links** — GitHub, email, Discord, LinkedIn, and X
- **Theme accents** — cycle accent colors from the header

## Experience highlights

| Area | Focus |
| --- | --- |
| Wet-lab research | DEK supercoiling, molecular biology, protein purification, PCR |
| Computational work | Python, R, ImageJ, AI-agent workflows, OCR / RAG pipelines |
| Clinical exposure | PET-CT, radiotherapy planning, QC/QA in oncology settings |
| Prototyping | Fusion 360, Blender, 3D printing, VR/AR workshops |

## Features

- Full-screen monospace canvas with drifting characters and cursor mask
- Right-aligned ASCII portrait from image luminance; long-press reveals full color via ripple
- Custom target-following cursor with parallax and accent-aware hover states
- Fuzzy accent headings and burst animations on navigation
- Responsive header with avatar, nav, social grid, and resume download
- Client-side routing for `/` and `/projects` on GitHub Pages

## Stack

React 19 · TypeScript · Vite · React Router · GSAP · GitHub Pages · GitHub Actions

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/hellojacky/](http://localhost:5173/hellojacky/) — the base path matches production on GitHub Pages.

Other scripts:

```bash
npm run build    # production build → dist/
npm run preview  # preview production build locally
npm run lint     # oxlint
```

## Deployment

Pushes to `main` trigger [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. `npm ci && npm run build`
2. Deploy `dist/` to GitHub Pages at `https://jackyissocute.github.io/hellojacky/`

## Customize

Most site copy and links live in one place:

| What to change | Where |
| --- | --- |
| Name, nav, social links | [`src/content/siteContent.ts`](src/content/siteContent.ts) |
| About text and projects | [`src/content/siteContent.ts`](src/content/siteContent.ts) |
| Resume PDF | Replace [`public/Resume_Jacky_Lin_2026_Summer.pdf`](public/Resume_Jacky_Lin_2026_Summer.pdf) or update `PUBLIC_ASSETS.resume` in [`src/config/site.ts`](src/config/site.ts) |
| Portrait images | [`public/jacky-lin.png`](public/jacky-lin.png), [`public/jacky-lin-color.png`](public/jacky-lin-color.png), [`public/jacky-lin-profile.jpg`](public/jacky-lin-profile.jpg) |
| GitHub Pages base path | [`src/config/site.ts`](src/config/site.ts) (`REPO_NAME`) and [`vite.config.ts`](vite.config.ts) |
| ASCII background tuning | [`src/lib/asciiBackground.ts`](src/lib/asciiBackground.ts) |
| Accent theme colors | `ACCENT_THEMES` in [`src/content/siteContent.ts`](src/content/siteContent.ts) |

Static assets in [`public/`](public/) are copied into `dist/` on build. Runtime URLs are resolved through [`src/lib/repoAsset.ts`](src/lib/repoAsset.ts), which prefixes paths with the GitHub Pages base (`/hellojacky/`).

## Repository layout

| Path | Role |
| --- | --- |
| [`src/pages/`](src/pages/) | Home and projects pages |
| [`src/components/SiteHeader.tsx`](src/components/SiteHeader.tsx) | Header, nav, social links, resume button |
| [`src/components/AsciiInteractiveBackground.tsx`](src/components/AsciiInteractiveBackground.tsx) | Interactive background wrapper |
| [`src/lib/asciiBackground.ts`](src/lib/asciiBackground.ts) | Canvas renderer — grid, cursor mask, portrait, color ripple |
| [`src/components/TargetCursor.tsx`](src/components/TargetCursor.tsx) | Custom cursor behavior |
| [`src/content/siteContent.ts`](src/content/siteContent.ts) | Site copy, projects, and theme accents |
| [`src/config/site.ts`](src/config/site.ts) | Repo URLs, Pages base path, asset filenames |
| [`public/`](public/) | Resume PDF, portraits, favicon, icons |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | GitHub Pages deploy workflow |

## Links

- **Website:** [jackyissocute.github.io/hellojacky](https://jackyissocute.github.io/hellojacky/)
- **GitHub:** [github.com/jackyissocute](https://github.com/jackyissocute)
- **LinkedIn:** [linkedin.com/in/jackylinhelpsualot](https://www.linkedin.com/in/jackylinhelpsualot)
- **Email:** [yl1000@duke.edu](mailto:yl1000@duke.edu)

---

*"What I cannot create, I do not understand."* — Richard Feynman
