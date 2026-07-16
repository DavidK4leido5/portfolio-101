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
    intro: 'Selected builds — live demos and source when available.',
  },
  experience: {
    headline: 'Experience',
    intro: 'Placeholder intro for the experience hotspot overlay.',
  },
  skills: {
    headline: 'Skills',
    intro: 'Click a radar vertex to inspect a stack. Scores are relative proficiency.',
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
