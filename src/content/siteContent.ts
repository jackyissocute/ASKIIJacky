export const ACCENT_THEMES = ['#f9a8d4', '#86efac', '#c084fc', '#93c5fd'] as const

export type Project = {
  name: string
  language: string
  description: string
  href: string
}

export const siteProfile = {
  name: 'jacky lin',
  avatarAlt: 'avatar',
  nav: [
    { label: '/home', href: '/' },
    { label: '/projects', href: '/projects' },
  ],
  social: [
    { label: 'github', href: 'https://github.com/jackyissocute', icon: 'github' as const },
    { label: 'email', href: 'mailto:jackyissocute@proton.me', icon: 'email' as const },
    { label: 'discord', href: 'https://discord.gg/qG2NhuAfUw', icon: 'discord' as const },
    { label: 'linkedin', href: 'https://www.linkedin.com/in/jackylinhelpsualot', icon: 'linkedin' as const },
    { label: 'x', href: 'https://x.com/jackyissocute', icon: 'x' as const },
  ],
}

export const aboutContent = {
  paragraphs: [
    {
      lines: ["duke kunshan 27' undergrad"],
    },
    {
      lines: [
        'working in molecular bioscience, biophysics, medical physics 3D Modeling, and protein engineering',
      ],
    },
    {
      lines: ['now into vibe coding, solving real life problems.'],
    },
  ],
  footer: "'what i cannot create, i do not understand.'",
}

export const projectsContent = {
  viewAllHref: '/projects',
  homePreviewCount: 3,
  items: [
    {
      name: 'lisper',
      language: 'protein engineering',
      description: 'lithium selective peptide engineering researh',
      href: 'https://jackyissocute.github.io/LiSPER-Dashboard/',
    },
    {
      name: 'supplier_doc_intelligence',
      language: 'python',
      description: 'pfizer extern inspired portable agent skills for pharmadoc',
      href: 'https://github.com/jackyissocute/supplier-doc-intelligence',
    },
    {
      name: 'dek_supercoil',
      language: 'molecular',
      description: 'research with prof. ferdinand kappes',
      href: 'https://docs.google.com/presentation/d/1b0qUJhPdiuNzq0_5MthvrSorVre94Fhm/edit?usp=sharing&ouid=107816883656707342855&rtpof=true&sd=true',
    },
  ] satisfies Project[],
}
