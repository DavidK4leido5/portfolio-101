export type ImageSource = {
  cdnUrl: string;
  localPath: string;
  alt: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  /** Tech / skill chips shown on the card */
  skills: string[];
  /** Live demo URL — omit or leave empty to hide the Live link */
  liveUrl?: string;
  /** Source repo URL — omit or leave empty to hide the GitHub link */
  githubUrl?: string;
  /** Optional status pill: live | wip */
  status?: "live" | "wip";
};

export type SkillTech = {
  name: string;
  /** 0–10 proficiency; bar width = score * 10% */
  score: number;
  /** Key into skillIcons map */
  icon: string;
};

export type SkillCategory = {
  id: string;
  label: string;
  /** 0–100; drives the radar polygon vertex */
  score: number;
  /** Key into skillIcons map */
  icon: string;
  tech: SkillTech[];
};

export type Experience = {
  id: string;
  role: string;
  company: string;
  description: string;
  image: ImageSource;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  /** Drop a photo at localPath later — UI shows initials until then */
  avatar: ImageSource;
};

export type HeroShapeId = "brain" | "network" | "stack";

export type HeroBeat = {
  text: string;
  shape: HeroShapeId;
};

export const profile = {
  name: "I'm David",
  title: "Creative Fullstack Engineer",
  tagline: "Every stack. One synapse.",
  hero: {
    beats: [
      { text: "FULLSTACK ENGINEER", shape: "brain" },
      { text: "UI TO INFRASTRUCTURE", shape: "network" },
      { text: "SHIP · SCALE · REFINE", shape: "stack" },
      { text: "THE ADAPTIVE MIND", shape: "brain" },
    ] satisfies HeroBeat[],
    holdSec: 2.2,
    morphSec: 1.4,
    textInSec: 0.7,
    textOutSec: 0.55,
  },
  avatar: {
    cdnUrl: "",
    localPath: "/src/content/assets/avatar.jpg",
    alt: "Profile photo placeholder",
  } satisfies ImageSource,
  about: {
    headline: "About",
    body: "Full-stack engineer focused on systems design and integration — shipping React, TypeScript, and Next.js products end to end, from UI and CMS-driven content to APIs, microservices, CI/CD, and cloud. I've built rate-limited backends, Docker pipelines that cut deploy time, Core Web Vitals wins, OpenAI integrations, and CMS-to-frontend wiring across pharmacy systems, marketing platforms, and AI products. I care about clean architecture, reliable interfaces between services, and product experiences that stay fast under load.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/about.jpg",
      alt: "About section image placeholder",
    } satisfies ImageSource,
  },
};

export const projects: Project[] = [
  {
    id: "anime-vault",
    title: "Anime Vault",
    description: "Anime catalog with infinite scroll and dynamic loading.",
    skills: ["React", "Next.js", "TypeScript", "Tailwind"],
    liveUrl: "https://anime-vault-lyart.vercel.app/",
    githubUrl: "https://github.com/DaddyPeeg/anime_vault",
    status: "live",
  },
  {
    id: "messenger-clone",
    title: "Messenger Clone",
    description:
      "Real-time chat app with conversations, presence, and a modern messaging UI.",
    skills: ["Next.js", "React", "Pusher", "Prisma", "Tailwind"],
    liveUrl: "https://messenger-clone-swart.vercel.app/",
    githubUrl: "https://github.com/DaddyPeeg/messenger-clone",
    status: "live",
  },
  {
    id: "kanban-app",
    title: "Kanban App",
    description:
      "SaaS-style Kanban board with drag-and-drop boards and progress tracking.",
    skills: ["React", "Next.js", "TypeScript", "Tailwind"],
    liveUrl: "https://task-management-kanban.vercel.app/",
    githubUrl: "https://github.com/DaddyPeeg/task-management-kanban",
    status: "live",
  },
  {
    id: "pathfinding",
    title: "Pathfinding Visualization",
    description:
      "Interactive graph pathfinding visualizer for classic search algorithms.",
    skills: ["React", "JavaScript", "Algorithms"],
    liveUrl: "https://daddypeeg.github.io/pathfinding/",
    githubUrl: "https://github.com/DaddyPeeg/pathfinding",
    status: "live",
  },
  {
    id: "react-admin",
    title: "React Admin",
    description:
      "Reusable admin template with charts, tables, and dashboard layouts.",
    skills: ["React", "TypeScript", "Tailwind"],
    liveUrl: "https://daddypeeg.github.io/react-admin-temp/",
    githubUrl: "https://github.com/DaddyPeeg/react-admin-temp",
    status: "live",
  },
  {
    id: "threads",
    title: "Threads",
    description:
      "Social app where users create threads and discuss topics in communities.",
    skills: ["Next.js", "React", "MongoDB", "Clerk", "Tailwind"],
    liveUrl: "https://threads-sample-app.vercel.app/",
    githubUrl: "https://github.com/DaddyPeeg/threads-app",
    status: "live",
  },
  {
    id: "codebility",
    title: "Codebility",
    description:
      "Employee and client management platform for digital delivery teams.",
    skills: ["Next.js", "React", "TypeScript", "Tailwind"],
    liveUrl: "https://codebility-fe.vercel.app/",
    githubUrl: "https://github.com/Zeff01/codebility-fe/tree/main",
    status: "live",
  },
  {
    id: "image-gallery",
    title: "Image Gallery",
    description:
      "Image gallery with Cloudinary-backed optimization and responsive layout.",
    skills: ["React", "Cloudinary", "TypeScript"],
    githubUrl: "https://github.com/DaddyPeeg/image-gallery-church",
    status: "wip",
  },
  {
    id: "discord-clone",
    title: "Discord Clone",
    description:
      "Discord-inspired app with realtime messaging and video chat foundations.",
    skills: ["Next.js", "React", "Socket.io", "Prisma"],
    githubUrl: "https://github.com/DaddyPeeg/discord-clone",
    status: "wip",
  },
];

export const skills: SkillCategory[] = [
  {
    id: "frontend",
    label: "Frontend Development",
    score: 88.6,
    icon: "atom",
    tech: [
      { name: "JavaScript (ES6+)", score: 9.5, icon: "javascript" },
      { name: "TypeScript", score: 9, icon: "typescript" },
      { name: "React", score: 9, icon: "react" },
      { name: "Tailwind CSS", score: 9, icon: "tailwind" },
      { name: "Vite", score: 9, icon: "vite" },
      { name: "Figma", score: 9, icon: "figma" },
    ],
  },
  {
    id: "backend",
    label: "Backend Development",
    score: 88,
    icon: "code",
    tech: [
      { name: "Node.js", score: 9.5, icon: "node" },
      { name: "NextJS", score: 10, icon: "nextjs" },
      { name: "Express.js", score: 9, icon: "express" },
      { name: "FastAPI", score: 9, icon: "fastapi" },
      { name: "REST API", score: 9, icon: "api" },
      { name: "GraphQL", score: 8.5, icon: "graphql" },
    ],
  },
  {
    id: "database",
    label: "Database Management",
    score: 81.4,
    icon: "database",
    tech: [
      { name: "PostgreSQL", score: 9, icon: "postgres" },
      { name: "MongoDB", score: 9, icon: "mongodb" },
      { name: "MySQL", score: 9, icon: "mysql" },
      { name: "Prisma", score: 8, icon: "prisma" },
      { name: "Firebase", score: 8.5, icon: "firebase" },
      { name: "Supabase", score: 7.5, icon: "supabase" },
    ],
  },
  {
    id: "devops",
    label: "DevOps/Deployment",
    score: 68.3,
    icon: "docker",
    tech: [
      { name: "GitHub Actions", score: 8, icon: "githubActions" },
      { name: "Docker", score: 7, icon: "docker" },
      { name: "Google Cloud", score: 7.5, icon: "gcp" },
      { name: "AWS", score: 6, icon: "aws" },
      { name: "Nginx", score: 6.5, icon: "nginx" },
      { name: "Apache", score: 6, icon: "apache" },
    ],
  },
  {
    id: "collaboration",
    label: "Version Control & Collaboration",
    score: 89.2,
    icon: "github",
    tech: [
      { name: "Git", score: 9, icon: "git" },
      { name: "GitHub", score: 9, icon: "github" },
      { name: "GitLab", score: 8, icon: "gitlab" },
      { name: "Jira", score: 10, icon: "jira" },
      { name: "Trello", score: 9, icon: "trello" },
      { name: "ClickUp", score: 8.5, icon: "clickup" },
    ],
  },
  {
    id: "algorithms",
    label: "Problem Solving & Algorithms",
    score: 70.5,
    icon: "algorithms",
    tech: [
      { name: "JavaScript", score: 9.5, icon: "javascript" },
      { name: "Python", score: 8, icon: "python" },
      { name: "TypeScript", score: 9, icon: "typescript" },
      { name: "Java", score: 7, icon: "java" },
      { name: "C++", score: 6, icon: "cpp" },
      { name: "LeetCode", score: 7, icon: "leetcode" },
    ],
  },
];

export const experience: Experience[] = [
  {
    id: "exp-revive",
    role: "Systems Engineer",
    company: "Revive Pharmacy",
    description:
      "Secured APIs, optimized databases, and shipped Docker CI/CD that cut deploy time by 75%.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "Revive Pharmacy",
    },
  },
  {
    id: "exp-tapup",
    role: "Fullstack Developer & Project Manager",
    company: "TapUp",
    description:
      "Led delivery end to end — product scope, fullstack implementation, and shipping the TapUp platform with the team.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "TapUp",
    },
  },
  {
    id: "exp-palace",
    role: "Fullstack Developer",
    company: "The Palace Manila",
    description:
      "Built and maintained fullstack features for The Palace Manila’s digital product surfaces.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "The Palace Manila",
    },
  },
  {
    id: "exp-volatility",
    role: "Frontend Developer",
    company: "Volatility",
    description:
      "High-converting landing pages, CMS-driven blog, and a webinar video platform.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "Volatility",
    },
  },
  {
    id: "exp-agentsly",
    role: "Full Stack Engineer",
    company: "Agentsly",
    description:
      "OpenAI / Vercel AI SDK integrations, ShadCN UI, and AWS deployments at 99.9% uptime.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "Agentsly",
    },
  },
  {
    id: "exp-codebility",
    role: "Fullstack Developer",
    company: "Codebility",
    description:
      "Fullstack work on the Codebility platform — Next.js performance, data layer improvements, and reliable delivery.",
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/experience/exp-1.jpg",
      alt: "Codebility",
    },
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t-fady",
    quote:
      "You’ve done an incredible job, and I’m really happy that I got to meet you and work with you for this long.",
    name: "Fady Ilias",
    title: "Director & Founder",
    company: "Web Divine",
    avatar: {
      cdnUrl: "",
      localPath: "/src/content/assets/testimonials/fady.jpg",
      alt: "Fady Ilias",
    },
  },
  {
    id: "t-shawn",
    quote:
      "Thank you for sharing. The truth is today a client hunted down my cell phone and thanked us for finding her the best plan. She fell ill with cancer and is doing better now.",
    name: "Shawn Milner",
    title: "Founder",
    company: "Agentsly",
    avatar: {
      cdnUrl: "",
      localPath: "/src/content/assets/testimonials/shawn.jpg",
      alt: "Shawn Milner",
    },
  },
  {
    id: "t-jzeff",
    quote:
      "David raised the bar on our Codebility platform — sharper Core Web Vitals, cleaner data work, and tests the team could trust. Exactly the kind of engineer you want early in a product.",
    name: "Jzeff Somera",
    title: "CEO",
    company: "Codebility",
    avatar: {
      cdnUrl: "",
      localPath: "/src/content/assets/testimonials/zeff.jpg",
      alt: "Jzeff Somera",
    },
  },
  {
    id: "t-daniel",
    quote:
      "As our Systems Engineer, David hardened our APIs, sped up the database layer, and stood up Docker CI/CD that made deploys dramatically faster. Reliable ownership end to end.",
    name: "Daniel Eskander",
    title: "Managing Director",
    company: "Revive Pharmacy",
    avatar: {
      cdnUrl: "",
      localPath: "/src/content/assets/testimonials/daniel.jpg",
      alt: "Daniel Eskander",
    },
  },
];

export const contact = {
  headline: "Contact",
  description:
    "Have a project or role in mind? Send a short note — I usually reply within a day or two.",
  email: "developer.work.david@gmail.com",
  links: [
    { label: "GitHub", url: "https://github.com/DavidK4leido5" },
    { label: "LinkedIn", url: "https://linkedin.com/in/davidrt1262/" },
  ],
  image: {
    cdnUrl: "",
    localPath: "/src/content/assets/contact.jpg",
    alt: "Contact section placeholder",
  } satisfies ImageSource,
};

export const sectionCopy = {
  projects: {
    headline: "Projects",
    intro: "Selected builds — live demos and source when available.",
  },
  experience: {
    headline: "Experience",
    intro: "Roles across systems, frontend, and full-stack delivery.",
  },
  skills: {
    headline: "Skills",
    intro:
      "Click a radar vertex to inspect a stack. Scores are relative proficiency.",
  },
  about: {
    headline: "About",
    intro:
      "Full-stack engineer — systems design, integration, and shipping end to end.",
  },
  contact: {
    headline: "Contact",
    intro: "Drop a message — or email / LinkedIn if you prefer.",
  },
} as const;

const localAssets = import.meta.glob(
  "./assets/**/*.{jpg,jpeg,png,webp,avif,gif,svg}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

export function resolveImage({ cdnUrl, localPath }: ImageSource): string {
  if (cdnUrl.trim()) return cdnUrl.trim();
  const path = localPath.trim();
  if (!path) return "";

  // Match `/src/content/assets/foo.jpg` or `./assets/foo.jpg` → `./assets/foo.jpg`
  const rel = path
    .replace(/^\/src\/content\/assets\//, "./assets/")
    .replace(/^src\/content\/assets\//, "./assets/")
    .replace(/^\.?\/?assets\//, "./assets/");

  if (localAssets[rel]) return localAssets[rel];

  const file = path.split("/").pop();
  if (file) {
    const hit = Object.entries(localAssets).find(([k]) =>
      k.endsWith(`/${file}`),
    );
    if (hit) return hit[1];
  }

  return path;
}
