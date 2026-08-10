export type ImageSource = {
  cdnUrl: string
  localPath: string
  alt: string
}

export type Project = {
  id: string
  title: string
  description: string
  /** Tech / skill chips shown on the card */
  skills: string[]
  /** Live demo URL — omit or leave empty to hide the Live link */
  liveUrl?: string
  /** Source repo URL — omit or leave empty to hide the GitHub link */
  githubUrl?: string
  /** Optional status pill: live | wip */
  status?: 'live' | 'wip'
}

export type SkillTech = {
  name: string
  /** 0–10 proficiency; bar width = score * 10% */
  score: number
  /** Key into skillIcons map */
  icon: string
}

export type SkillCategory = {
  id: string
  label: string
  /** 0–100; drives the radar polygon vertex */
  score: number
  /** Key into skillIcons map */
  icon: string
  tech: SkillTech[]
}

export type Experience = {
  id: string
  role: string
  company: string
  period: string
  description: string
  image: ImageSource
}

export type Contribution = {
  id: string
  role: string
  company: string
  period: string
  highlights: string[]
}

export type Testimonial = {
  id: string
  quote: string
  name: string
  title: string
  company: string
}

export type HeroShapeId = 'brain' | 'network' | 'stack'

export type HeroBeat = {
  text: string
  shape: HeroShapeId
}

export const profile = {
  name: 'I\'m David',
  title: 'Creative Fullstack Engineer',
  tagline: 'Every stack. One synapse.',
  hero: {
    beats: [
      { text: 'FULLSTACK ENGINEER', shape: 'brain' },
      { text: 'UI TO INFRASTRUCTURE', shape: 'network' },
      { text: 'SHIP · SCALE · REFINE', shape: 'stack' },
      { text: 'THE ADAPTIVE MIND', shape: 'brain' },
    ] satisfies HeroBeat[],
    holdSec: 2.2,
    morphSec: 1.4,
    textInSec: 0.7,
    textOutSec: 0.55,
  },
  avatar: {
    cdnUrl: '',
    localPath: '/src/content/assets/avatar.jpg',
    alt: 'Profile photo placeholder',
  } satisfies ImageSource,
  about: {
    headline: 'About',
    body: 'Full-stack engineer focused on systems design and integration — shipping React, TypeScript, and Next.js products end to end, from UI and CMS-driven content to APIs, microservices, CI/CD, and cloud. I\'ve built rate-limited backends, Docker pipelines that cut deploy time, Core Web Vitals wins, OpenAI integrations, and CMS-to-frontend wiring across pharmacy systems, marketing platforms, and AI products. I care about clean architecture, reliable interfaces between services, and product experiences that stay fast under load.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/about.jpg',
      alt: 'About section image placeholder',
    } satisfies ImageSource,
  },
}

export const projects: Project[] = [
  {
    id: 'anime-vault',
    title: 'Anime Vault',
    description: 'Anime catalog with infinite scroll and dynamic loading.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind'],
    liveUrl: 'https://anime-vault-lyart.vercel.app/',
    githubUrl: 'https://github.com/DaddyPeeg/anime_vault',
    status: 'live',
  },
  {
    id: 'messenger-clone',
    title: 'Messenger Clone',
    description: 'Real-time chat app with conversations, presence, and a modern messaging UI.',
    skills: ['Next.js', 'React', 'Pusher', 'Prisma', 'Tailwind'],
    liveUrl: 'https://messenger-clone-swart.vercel.app/',
    githubUrl: 'https://github.com/DaddyPeeg/messenger-clone',
    status: 'live',
  },
  {
    id: 'kanban-app',
    title: 'Kanban App',
    description: 'SaaS-style Kanban board with drag-and-drop boards and progress tracking.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind'],
    liveUrl: 'https://task-management-kanban.vercel.app/',
    githubUrl: 'https://github.com/DaddyPeeg/task-management-kanban',
    status: 'live',
  },
  {
    id: 'pathfinding',
    title: 'Pathfinding Visualization',
    description: 'Interactive graph pathfinding visualizer for classic search algorithms.',
    skills: ['React', 'JavaScript', 'Algorithms'],
    liveUrl: 'https://daddypeeg.github.io/pathfinding/',
    githubUrl: 'https://github.com/DaddyPeeg/pathfinding',
    status: 'live',
  },
  {
    id: 'react-admin',
    title: 'React Admin',
    description: 'Reusable admin template with charts, tables, and dashboard layouts.',
    skills: ['React', 'TypeScript', 'Tailwind'],
    liveUrl: 'https://daddypeeg.github.io/react-admin-temp/',
    githubUrl: 'https://github.com/DaddyPeeg/react-admin-temp',
    status: 'live',
  },
  {
    id: 'threads',
    title: 'Threads',
    description: 'Social app where users create threads and discuss topics in communities.',
    skills: ['Next.js', 'React', 'MongoDB', 'Clerk', 'Tailwind'],
    liveUrl: 'https://threads-sample-app.vercel.app/',
    githubUrl: 'https://github.com/DaddyPeeg/threads-app',
    status: 'live',
  },
  {
    id: 'codebility',
    title: 'Codebility',
    description: 'Employee and client management platform for digital delivery teams.',
    skills: ['Next.js', 'React', 'TypeScript', 'Tailwind'],
    liveUrl: 'https://codebility-fe.vercel.app/',
    githubUrl: 'https://github.com/Zeff01/codebility-fe/tree/main',
    status: 'live',
  },
  {
    id: 'image-gallery',
    title: 'Image Gallery',
    description: 'Image gallery with Cloudinary-backed optimization and responsive layout.',
    skills: ['React', 'Cloudinary', 'TypeScript'],
    githubUrl: 'https://github.com/DaddyPeeg/image-gallery-church',
    status: 'wip',
  },
  {
    id: 'discord-clone',
    title: 'Discord Clone',
    description: 'Discord-inspired app with realtime messaging and video chat foundations.',
    skills: ['Next.js', 'React', 'Socket.io', 'Prisma'],
    githubUrl: 'https://github.com/DaddyPeeg/discord-clone',
    status: 'wip',
  },
]

export const skills: SkillCategory[] = [
  {
    id: 'frontend',
    label: 'Frontend Development',
    score: 88.6,
    icon: 'atom',
    tech: [
      { name: 'JavaScript (ES6+)', score: 9.5, icon: 'javascript' },
      { name: 'TypeScript', score: 9, icon: 'typescript' },
      { name: 'React', score: 9, icon: 'react' },
      { name: 'Tailwind CSS', score: 9, icon: 'tailwind' },
      { name: 'Vite', score: 9, icon: 'vite' },
      { name: 'Figma', score: 9, icon: 'figma' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend Development',
    score: 88,
    icon: 'code',
    tech: [
      { name: 'Node.js', score: 9.5, icon: 'node' },
      { name: 'NextJS', score: 10, icon: 'nextjs' },
      { name: 'Express.js', score: 9, icon: 'express' },
      { name: 'FastAPI', score: 9, icon: 'fastapi' },
      { name: 'REST API', score: 9, icon: 'api' },
      { name: 'GraphQL', score: 8.5, icon: 'graphql' },
    ],
  },
  {
    id: 'database',
    label: 'Database Management',
    score: 81.4,
    icon: 'database',
    tech: [
      { name: 'PostgreSQL', score: 9, icon: 'postgres' },
      { name: 'MongoDB', score: 9, icon: 'mongodb' },
      { name: 'MySQL', score: 9, icon: 'mysql' },
      { name: 'Prisma', score: 8, icon: 'prisma' },
      { name: 'Firebase', score: 8.5, icon: 'firebase' },
      { name: 'Supabase', score: 7.5, icon: 'supabase' },
    ],
  },
  {
    id: 'devops',
    label: 'DevOps/Deployment',
    score: 68.3,
    icon: 'docker',
    tech: [
      { name: 'GitHub Actions', score: 8, icon: 'githubActions' },
      { name: 'Docker', score: 7, icon: 'docker' },
      { name: 'Google Cloud', score: 7.5, icon: 'gcp' },
      { name: 'AWS', score: 6, icon: 'aws' },
      { name: 'Nginx', score: 6.5, icon: 'nginx' },
      { name: 'Apache', score: 6, icon: 'apache' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Version Control & Collaboration',
    score: 89.2,
    icon: 'github',
    tech: [
      { name: 'Git', score: 9, icon: 'git' },
      { name: 'GitHub', score: 9, icon: 'github' },
      { name: 'GitLab', score: 8, icon: 'gitlab' },
      { name: 'Jira', score: 10, icon: 'jira' },
      { name: 'Trello', score: 9, icon: 'trello' },
      { name: 'ClickUp', score: 8.5, icon: 'clickup' },
    ],
  },
  {
    id: 'algorithms',
    label: 'Problem Solving & Algorithms',
    score: 70.5,
    icon: 'algorithms',
    tech: [
      { name: 'JavaScript', score: 9.5, icon: 'javascript' },
      { name: 'Python', score: 8, icon: 'python' },
      { name: 'TypeScript', score: 9, icon: 'typescript' },
      { name: 'Java', score: 7, icon: 'java' },
      { name: 'C++', score: 6, icon: 'cpp' },
      { name: 'LeetCode', score: 7, icon: 'leetcode' },
    ],
  },
]

export const experience: Experience[] = [
  {
    id: 'exp-revive',
    role: 'Systems Engineer',
    company: 'Revive Pharmacy',
    period: 'Mar 2025 — Aug 2026',
    description: 'Secured APIs, optimized databases, and shipped Docker CI/CD that cut deploy time by 75%.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/experience/exp-1.jpg',
      alt: 'Revive Pharmacy',
    },
  },
  {
    id: 'exp-volatility',
    role: 'Frontend Developer',
    company: 'Volatility',
    period: 'Nov 2024 — Feb 2025',
    description: 'High-converting landing pages, CMS-driven blog, and a webinar video platform.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/experience/exp-1.jpg',
      alt: 'Volatility',
    },
  },
  {
    id: 'exp-agentsly',
    role: 'Full Stack Engineer',
    company: 'Agentsly',
    period: 'Jun 2024 — Oct 2024',
    description: 'OpenAI / Vercel AI SDK integrations, ShadCN UI, and AWS deployments at 99.9% uptime.',
    image: {
      cdnUrl: '',
      localPath: '/src/content/assets/experience/exp-1.jpg',
      alt: 'Agentsly',
    },
  },
]

export const contributions: Contribution[] = [
  {
    id: 'contrib-revive',
    role: 'Systems Engineer',
    company: 'Revive Pharmacy',
    period: 'Mar 2025 — Aug 2026',
    highlights: [
      'Rate limiting and API hardening against DDoS and abuse',
      'Query and index work that cut response times by 40%',
      'Docker + VPS CI/CD pipeline — 75% faster deploys',
      'Unit test suites for critical backend services',
    ],
  },
  {
    id: 'contrib-volatility',
    role: 'Frontend Developer',
    company: 'Volatility',
    period: 'Nov 2024 — Feb 2025',
    highlights: [
      'Landing page that lifted engagement and conversions by 22%',
      'CMS-integrated dynamic blog for non-technical updates',
      'Webinar video platform for live online events',
      'UI bugfixes that reduced bounce from user feedback',
    ],
  },
  {
    id: 'contrib-agentsly',
    role: 'Full Stack Engineer',
    company: 'Agentsly',
    period: 'Jun 2024 — Oct 2024',
    highlights: [
      'ChatGPT via Vercel AI SDK and OpenAI API',
      'ShadCN UI system — 30% faster UI delivery',
      'AWS deployments with 99.9% uptime',
    ],
  },
  {
    id: 'contrib-codebility',
    role: 'Software Engineering Intern',
    company: 'Codebility',
    period: 'Nov 2023 — May 2024',
    highlights: [
      'Next.js rendering work — Core Web Vitals +35%',
      'MySQL query optimization under load',
      'Unit tests that cut manual regression effort by 50%',
    ],
  },
  {
    id: 'contrib-comelec',
    role: 'Administrative Aide II · System Admin',
    company: 'Commission on Elections',
    period: 'Jul 2022 — Jul 2023',
    highlights: [
      'Trained municipal election volunteers on COMELEC systems',
      'Routine updates and MySQL database maintenance',
      'Custom cleanup scripts to resolve data errors',
    ],
  },
]

export const testimonials: Testimonial[] = [
  {
    id: 't-1',
    quote: 'David ships end-to-end — UI, APIs, and infra — without losing the plot on reliability.',
    name: 'Colleague Name',
    title: 'Engineering Lead',
    company: 'Placeholder Co.',
  },
  {
    id: 't-2',
    quote: 'Clear communicator who turns messy product requirements into stable, performant releases.',
    name: 'Collaborator Name',
    title: 'Product Manager',
    company: 'Placeholder Co.',
  },
  {
    id: 't-3',
    quote: 'The kind of fullstack partner you want when systems design and integration actually matter.',
    name: 'Teammate Name',
    title: 'Senior Developer',
    company: 'Placeholder Co.',
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
    intro: 'Selected builds — live demos and source when available.',
  },
  experience: {
    headline: 'Experience',
    intro: 'Roles across systems, frontend, and full-stack delivery — deeper notes also live in Contributions above.',
  },
  skills: {
    headline: 'Skills',
    intro: 'Click a radar vertex to inspect a stack. Scores are relative proficiency.',
  },
  about: {
    headline: 'About',
    intro: 'Full-stack engineer — systems design, integration, and shipping end to end.',
  },
  contact: {
    headline: 'Contact',
    intro: 'Placeholder intro for the contact hotspot overlay.',
  },
} as const

export function resolveImage({ cdnUrl, localPath }: ImageSource): string {
  return cdnUrl.trim() || localPath
}
