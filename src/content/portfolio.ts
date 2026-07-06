export type ImageSource = {
  cdnUrl: string
  localPath: string
  alt: string
}

export type Project = {
  id: string
  title: string
  description: string
  tags: string[]
  image: ImageSource
  link: string
}

export type Skill = {
  id: string
  name: string
  description: string
  level: 'learning' | 'comfortable' | 'expert'
  image: ImageSource
}

export type Experience = {
  id: string
  role: string
  company: string
  period: string
  description: string
  image: ImageSource
}

export const profile = {
  name: 'I\'m David',
  title: 'Creative Frontend Engineer',
  tagline: 'Every stack. One synapse.',
  hero: {
    top: '',
    bottom: 'THE ADAPTIVE MIND',
  },
  avatar: {
    cdnUrl: '',
    localPath: '/src/content/assets/avatar.jpg',
    alt: 'Profile photo placeholder',
  } satisfies ImageSource,
  about: {
    headline: 'About',
    body: 'Placeholder bio. Replace with your story, focus areas, and what you build.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/about.jpg',
      alt: 'About section image placeholder',
    } satisfies ImageSource,
  },
}

export const projects: Project[] = [
  {
    id: 'project-1',
    title: 'Project One',
    description: 'Placeholder project description. Link a live demo or case study when ready.',
    tags: ['React', 'Three.js', 'GSAP'],
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/projects/project-1.jpg',
      alt: 'Project one thumbnail placeholder',
    },
    link: 'https://example.com',
  },
  {
    id: 'project-2',
    title: 'Project Two',
    description: 'Placeholder project description.',
    tags: ['WebGL', 'R3F'],
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/projects/project-2.jpg',
      alt: 'Project two thumbnail placeholder',
    },
    link: 'https://example.com',
  },
]

export const skills: Skill[] = [
  {
    id: 'skill-react',
    name: 'React',
    description: 'Placeholder skill note.',
    level: 'expert',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/skills/react.jpg',
      alt: 'React skill placeholder',
    },
  },
  {
    id: 'skill-webgl',
    name: 'WebGL / Three.js',
    description: 'Placeholder skill note.',
    level: 'comfortable',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/skills/webgl.jpg',
      alt: 'WebGL skill placeholder',
    },
  },
]

export const experience: Experience[] = [
  {
    id: 'exp-1',
    role: 'Frontend Engineer',
    company: 'Company Name',
    period: '2022 — Present',
    description: 'Placeholder experience summary.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/experience/exp-1.jpg',
      alt: 'Experience placeholder',
    },
  },
]

export const contact = {
  headline: 'Contact',
  description: 'Placeholder contact blurb. Add how you prefer to be reached.',
  email: 'you@example.com',
  links: [
    { label: 'GitHub', url: 'https://github.com/your-handle' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/your-handle' },
  ],
  image: {
    cdnUrl: '',
    localPath: '/src/content/assets/contact.jpg',
    alt: 'Contact section placeholder',
  } satisfies ImageSource,
}

export const sectionCopy = {
  projects: {
    headline: 'Projects',
    intro: 'Placeholder intro for the projects hotspot overlay.',
  },
  experience: {
    headline: 'Experience',
    intro: 'Placeholder intro for the experience hotspot overlay.',
  },
  skills: {
    headline: 'Skills',
    intro: 'Placeholder intro for the skills hotspot overlay.',
  },
  about: {
    headline: 'About',
    intro: 'Placeholder intro for the about hotspot overlay.',
  },
  contact: {
    headline: 'Contact',
    intro: 'Placeholder intro for the contact hotspot overlay.',
  },
} as const

export function resolveImage({ cdnUrl, localPath }: ImageSource): string {
  return cdnUrl.trim() || localPath
}
