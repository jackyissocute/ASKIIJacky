export const GITHUB_OWNER = 'jackyissocute'
export const REPO_NAME = 'hellojacky'

/** Must match the GitHub Pages project-site path and `base` in vite.config.ts */
export const GITHUB_PAGES_BASE = `/${REPO_NAME}/`

/** BrowserRouter basename (no trailing slash) */
export const ROUTER_BASENAME = GITHUB_PAGES_BASE.replace(/\/$/, '')

export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${REPO_NAME}`
export const SITE_URL = `https://${GITHUB_OWNER}.github.io/${REPO_NAME}/`

/** Static assets served from `public/` at the GitHub Pages site root */
export const PUBLIC_ASSETS = {
  portraitLuminance: 'jacky-lin.png',
  portraitColor: 'jacky-lin-color.png',
  profilePhoto: 'jacky-lin-profile.jpg',
  favicon: 'jacky-lin.png',
  icons: 'icons.svg',
} as const
