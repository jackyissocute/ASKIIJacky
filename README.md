# hellojacky — Interactive ASCII Background

Full-screen monospace canvas inspired by [contentarchitecture.dev](https://contentarchitecture.dev), deployed as a GitHub Pages project site.

**Live site:** [jackyissocute.github.io/hellojacky](https://jackyissocute.github.io/hellojacky/)

## Features

- Full-screen monospace text grid with subtle character drift
- Right-aligned portrait rendered from image luminance (ASCII halftone shading)
- Cursor circular mask — characters dissolve inside a soft-edged radius around the pointer
- Long-press on the portrait to reveal full color via an outward ripple; release to dissolve back to monochrome

## Repository layout

| Path | Role |
| --- | --- |
| [`src/lib/asciiBackground.ts`](src/lib/asciiBackground.ts) | Canvas renderer — grid, cursor mask, portrait sampling, color ripple |
| [`src/components/AsciiInteractiveBackground.tsx`](src/components/AsciiInteractiveBackground.tsx) | React wrapper and default options |
| [`src/config/site.ts`](src/config/site.ts) | GitHub repo URLs, Pages base path, static asset names |
| [`src/lib/repoAsset.ts`](src/lib/repoAsset.ts) | Resolves `public/` assets against the GitHub Pages base URL |
| [`public/jacky-lin.png`](public/jacky-lin.png) | Grayscale portrait used for luminance shading |
| [`public/jacky-lin-color.png`](public/jacky-lin-color.png) | Color portrait revealed on long-press |
| [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | Build with Vite and deploy `dist/` to GitHub Pages |

All runtime asset URLs are resolved through `repoAsset()` in [`src/lib/repoAsset.ts`](src/lib/repoAsset.ts), which prefixes paths with the GitHub Pages base (`/hellojacky/`). Portrait PNGs live in [`public/`](public/) and are copied verbatim into `dist/` on build.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/hellojacky/](http://localhost:5173/hellojacky/) (note the repo base path matches GitHub Pages).

## Deployment

The site deploys automatically when changes are pushed to `main`.

1. **Source:** GitHub Actions ([`deploy.yml`](.github/workflows/deploy.yml))
2. **Build:** `npm ci && npm run build` → output in `dist/`
3. **Host:** GitHub Pages at `https://jackyissocute.github.io/hellojacky/`

To redeploy after editing the repo, merge or push to `main` and watch the **Deploy to GitHub Pages** workflow under the repository **Actions** tab.

## Customize

| What to change | Where |
| --- | --- |
| Portrait images | Replace [`public/jacky-lin.png`](public/jacky-lin.png) and [`public/jacky-lin-color.png`](public/jacky-lin-color.png) (keep filenames, or update `PUBLIC_ASSETS` in [`src/config/site.ts`](src/config/site.ts)) |
| Grid, cursor, drift, ripple tuning | [`src/lib/asciiBackground.ts`](src/lib/asciiBackground.ts) options and defaults |
| Component-level defaults | [`src/components/AsciiInteractiveBackground.tsx`](src/components/AsciiInteractiveBackground.tsx) |
| Pages base path (if repo is renamed) | [`src/config/site.ts`](src/config/site.ts) (`REPO_NAME`, `GITHUB_PAGES_BASE`) and [`vite.config.ts`](vite.config.ts) |

## Core algorithm

```
for each grid cell (col, row):
  1. Sample portrait luminance at the cell (right-aligned layout)
  2. Map luminance → grayscale character color on person pixels
  3. If distance(cell, cursor) < cursorRadius:
       skip draw or feather with smoothstep   // circular void
  4. If long-press ripple has reached the cell:
       draw sampled color from jacky-lin-color.png
  5. Else draw textPool[index] with drift animation
```

## Stack

React 19 · TypeScript · Vite · GitHub Pages · GitHub Actions
