import type { IconType } from 'react-icons'
import { DiAtom, DiCode, DiNginx, DiPostgresql } from 'react-icons/di'
import {
  FaAws, FaBootstrap, FaCss3Alt, FaDocker, FaGithub, FaGitAlt,
  FaHtml5, FaJava, FaJira, FaNode, FaPhp, FaPython, FaReact, FaTrello, FaUserLock,
} from 'react-icons/fa'
import { GrGraphQl } from 'react-icons/gr'
import { IoLogoFigma, IoLogoFirebase, IoLogoJavascript } from 'react-icons/io5'
import {
  RiNextjsFill, RiSupabaseFill, RiTailwindCssFill,
} from 'react-icons/ri'
import {
  SiApache, SiCplusplus, SiClickup, SiDrizzle, SiExpress, SiFastapi,
  SiGithubactions, SiGitlab, SiGooglecloud, SiLeetcode, SiMongodb, SiMysql,
  SiPrisma, SiShadcnui, SiThealgorithms, SiTypescript, SiVite, SiWebpack,
} from 'react-icons/si'
import { TbApi, TbDatabase } from 'react-icons/tb'

/** String keys used in portfolio.ts → react-icons components */
export const SKILL_ICONS: Record<string, IconType> = {
  atom: DiAtom,
  code: DiCode,
  database: TbDatabase,
  docker: FaDocker,
  github: FaGithub,
  algorithms: SiThealgorithms,
  html5: FaHtml5,
  css3: FaCss3Alt,
  javascript: IoLogoJavascript,
  react: FaReact,
  bootstrap: FaBootstrap,
  tailwind: RiTailwindCssFill,
  typescript: SiTypescript,
  figma: IoLogoFigma,
  shadcn: SiShadcnui,
  webpack: SiWebpack,
  vite: SiVite,
  node: FaNode,
  php: FaPhp,
  python: FaPython,
  java: FaJava,
  express: SiExpress,
  nextjs: RiNextjsFill,
  fastapi: SiFastapi,
  graphql: GrGraphQl,
  api: TbApi,
  auth: FaUserLock,
  mysql: SiMysql,
  postgres: DiPostgresql,
  mongodb: SiMongodb,
  firebase: IoLogoFirebase,
  supabase: RiSupabaseFill,
  prisma: SiPrisma,
  drizzle: SiDrizzle,
  aws: FaAws,
  gcp: SiGooglecloud,
  githubActions: SiGithubactions,
  nginx: DiNginx,
  apache: SiApache,
  git: FaGitAlt,
  gitlab: SiGitlab,
  jira: FaJira,
  trello: FaTrello,
  clickup: SiClickup,
  cpp: SiCplusplus,
  leetcode: SiLeetcode,
}

export function SkillIcon({
  name,
  className,
  size = 18,
}: {
  name: string
  className?: string
  size?: number
}) {
  const Icon = SKILL_ICONS[name]
  if (!Icon) return <span className={className} aria-hidden>●</span>
  return <Icon className={className} size={size} aria-hidden />
}
