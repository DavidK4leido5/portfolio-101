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
  /** Live client domain — omit when the work is not publicly reachable */
  domain?: string;
  /** Matches the `client-work/` filename prefix, e.g. `revivepharmacy` */
  slug: string;
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
  /** Display range, e.g. "Mar 2025 - Aug 2026" */
  period: string;
  description: string;
  /** Matches the `client-work/` filename prefix; omit when there are no shots */
  slug?: string;
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

export type Fact = {
  label: string;
  value: string;
};

export type Stat = {
  value: string;
  label: string;
};

export const profile = {
  name: "I'm David",
  fullName: "David Remus Tribugenia",
  title: "Full Stack Engineer",
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
  about: {
    headline: "About",
    role: "Full Stack Engineer",
    location: "Negros Occidental, Philippines",
    /** Shown in the avatar circle until a photo is dropped in */
    initials: "DT",
    body: [
      "I build and run web systems end to end. I started in 2021 keeping the voter registration system online for the Commission on Elections, managing MySQL records under data privacy law and leading the people who ran it. That work taught me to assume production breaks at the worst possible time, and to build so it doesn't.",
      "Since then I've shipped for founders and directors who needed one person to own a system. Node and Postgres services behind a rate-limited Nginx layer at Revive Pharmacy. LLM features and AWS production at Agentsly. Next.js rendering and Core Web Vitals at Codebility, where I also mentored juniors and ran code review. Right now I'm on contract with The Palace Manila.",
      "What I care about is the unglamorous part. Clear boundaries between services, interfaces that don't surprise the next developer, and pages that stay fast when the traffic actually shows up. I'd rather delete code than add a layer.",
    ],
    facts: [
      { label: "Based", value: "Negros Occidental, PH" },
      { label: "Experience", value: "5 years (3 shipping product)" },
      { label: "Hours", value: "AU business hours" },
      { label: "Focus", value: "React · Node · Postgres" },
      { label: "Status", value: "Open to work" },
      { label: "Education", value: "BS Computer Engineering, TUP" },
    ] satisfies Fact[],
    numbers: [
      { value: "99.9%", label: "AWS uptime at Agentsly" },
      { value: "75%", label: "Faster deploys at Revive Pharmacy" },
      { value: "80%", label: "More leads at The Palace Manila" },
      { value: "35%", label: "Core Web Vitals gain at Codebility" },
    ] satisfies Stat[],
    /**
     * Drop a square crop at `src/content/assets/about.jpg`.
     * The circle applies `object-fit: cover` and `filter: grayscale(1)`,
     * so a colour photo goes black and white with no extra editing.
     */
    image: {
      cdnUrl: "",
      localPath: "/src/content/assets/about.jpg",
      alt: "David Remus Tribugenia",
    } satisfies ImageSource,
  },
};

/**
 * Client work shown in the Projects sector and walked through in the
 * scroll journey below it. Adding one is five fields: `slug` must match the
 * `client-work/` filename prefix so the screenshots attach themselves.
 * Story copy for the journey lives in `./projects.ts`.
 */
export const projects: Project[] = [
  {
    id: "palace",
    title: "The Palace Manila",
    description:
      "Events venue site on Webflow CMS: rooms, event types, booking enquiries, and lead capture, with an on-page SEO campaign behind it.",
    skills: ["Webflow CMS", "SEO", "Python", "Content modelling"],
    domain: "https://the-palace-manila-prototype.webflow.io/",
    slug: "thepalacemanila",
  },
  {
    id: "revive",
    title: "Revive Pharmacy",
    description:
      "Pharmacy platform split into Node.js microservices on PostgreSQL and Redis, hardened behind Nginx and deployed by Docker CI/CD.",
    skills: ["Node.js", "PostgreSQL", "Redis", "Nginx", "Docker", "Linux"],
    domain: "https://revivepharmacy.com.au/",
    slug: "revivepharmacy",
  },
  {
    id: "volatility",
    title: "Volatility",
    description:
      "Marketing funnel for a trading education business: React landing pages, a Strapi-driven blog, and a live webinar video platform.",
    skills: ["React", "Strapi", "Video", "SEO"],
    domain: "https://volatility.com.au/",
    slug: "volatility",
  },
  {
    id: "agentsly",
    title: "Agentsly",
    description:
      "AI product with LLM features on the Vercel AI SDK and OpenAI, GraphQL and REST over PostgreSQL, running on AWS at 99.9% uptime.",
    skills: ["React", "Node.js", "GraphQL", "PostgreSQL", "Vercel AI SDK", "AWS"],
    slug: "agentsly",
  },
  {
    id: "tapup",
    title: "TapUp",
    description:
      "A card platform where an account is a card. Developer profiles, portfolios, and social features on Next.js and Firebase.",
    skills: ["Next.js", "Firebase Auth", "Firestore", "Firebase Storage", "TypeScript"],
    domain: "https://www.tapup.tech/",
    slug: "tapup",
  },
  {
    id: "codebility",
    title: "Codebility",
    description:
      "Employee and client management platform for a digital delivery team, tuned for Next.js rendering and Core Web Vitals.",
    skills: ["Next.js", "TypeScript", "Jest", "Tailwind"],
    domain: "https://www.codebility.tech/",
    slug: "codebility",
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

/** Newest first. `slug` pulls the card image from `client-work/`. */
export const experience: Experience[] = [
  {
    id: "exp-palace",
    role: "Full Stack Engineer (Contract)",
    company: "The Palace Manila",
    period: "Aug 2026 - Present",
    description:
      "A Webflow CMS site for venues, events, booking, and lead capture, plus the on-page SEO campaign behind it. Reworking the booking, inquiry, and newsletter paths raised lead volume about 80%.",
    slug: "thepalacemanila",
  },
  {
    id: "exp-revive",
    role: "Systems Engineer",
    company: "Revive Pharmacy",
    period: "Mar 2025 - Aug 2026",
    description:
      "Node.js microservices on PostgreSQL and Redis so pharmacy services could deploy and fail independently, hardened behind Nginx with rate limiting on a Linux VPS. Docker CI/CD cut deploy time about 75%.",
    slug: "revivepharmacy",
  },
  {
    id: "exp-volatility",
    role: "Full Stack Engineer",
    company: "Volatility",
    period: "Oct 2024 - Feb 2025",
    description:
      "Responsive React landing pages for the marketing funnel, Strapi CMS wired into the frontend for the blog, and a video platform hosting recurring live webinars. Conversions rose about 22%.",
    slug: "volatility",
  },
  {
    id: "exp-agentsly",
    role: "Full Stack Engineer",
    company: "Agentsly",
    period: "May 2024 - Oct 2024",
    description:
      "Full-stack LLM features with the Vercel AI SDK and OpenAI, REST and GraphQL over PostgreSQL, and GoHighLevel wired in so the team could follow a lead from capture through follow-up. Production ran on AWS at 99.9% uptime.",
    slug: "agentsly",
  },
  {
    id: "exp-tapup",
    role: "Fullstack Developer & Project Manager",
    company: "TapUp",
    period: "Nov 2023 - May 2024",
    description:
      "A card platform where every account is a card: developer profiles, portfolios, and social features on Next.js and Firebase. I ran scope and delivery as well as building it.",
    slug: "tapup",
  },
  {
    id: "exp-codebility",
    role: "Full Stack Engineer / Mentor",
    company: "Codebility",
    period: "Nov 2023 - May 2024",
    description:
      "Mentored juniors on Next.js, TypeScript, and Jest, ran code review on every pull request, and wrote unit tests for the critical flows. Core Web Vitals improved about 35%.",
    slug: "codebility",
  },
  {
    id: "exp-comelec",
    role: "System Administrator",
    company: "Commission on Elections",
    period: "Sep 2021 - Jul 2023",
    description:
      "Kept the voter registration system online through updates, backups, and live incident response, and led the team running it. MySQL records for large volumes of personnel data, under data privacy law, with strict access control and backup routines.",
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t-fady",
    quote:
      "David has done an outstanding job for us. We worked together over a long stretch, and in that time he became the person I could hand a problem to and then stop thinking about it. I’m genuinely glad we crossed paths.",
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
      "The proof came from a client who tracked down my personal number just to thank us for finding her the right plan. That only happens when the product genuinely works. David built the parts that made it work.",
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
      "David left the Codebility platform measurably better than he found it. Core Web Vitals improved, the data layer finally got a proper cleanup, and he shipped tests the rest of the team actually trusted. He is the kind of engineer you want on a product early.",
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
      "As our Systems Engineer, David secured our APIs, sped up the database layer, and built the Docker CI/CD pipeline that cut our deploy time by roughly 75%. He owned all of it end to end, and I never once had to chase him for a status update.",
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
    "Have a project or role in mind? Send a short note and I'll reply within a day or two.",
  email: "developer.work.david@gmail.com",
  meta: [
    { label: "Status", value: "Open to work" },
    { label: "Hours", value: "AU business hours" },
    { label: "Reply", value: "Within a day or two" },
  ] satisfies Fact[],
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
    intro: "Six client builds. The full walkthrough runs below this journey.",
  },
  experience: {
    headline: "Experience",
    intro: "Seven roles, newest first, with the numbers that came out of them.",
  },
  skills: {
    headline: "Skills",
    intro:
      "Click a radar vertex to open a stack. Scores are self-rated and relative.",
  },
  about: {
    headline: "About",
    intro: "Five years keeping systems online. Three shipping product.",
  },
  contact: {
    headline: "Contact",
    intro: "The form, email, or LinkedIn. All of them reach me.",
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
