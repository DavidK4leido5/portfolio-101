import { clientWorkGroups, type ClientWork } from './clientWorks'
import { experience, projects, type Project } from './portfolio'

/**
 * Long-form walkthrough for the projects scroll journey.
 *
 * Add a project by adding it to `projects` in `./portfolio.ts`, then adding
 * three copy blocks here under the same id. Screenshots attach themselves from
 * `assets/client-work/` via the project's `slug`, split across the three blocks
 * in filename order, so there are no image paths to maintain here.
 */

export type ProjectBeatId = 'intro' | 'tech' | 'build'

const BEAT_LABELS: Record<ProjectBeatId, string> = {
  intro: 'Project intro',
  tech: 'Technologies used',
  build: 'Design & implementation',
}

const BEAT_ORDER: ProjectBeatId[] = ['intro', 'tech', 'build']

type StoryCopy = Record<ProjectBeatId, string>

const STORIES: Record<string, StoryCopy> = {
  palace: {
    intro:
      "The Palace Manila needed a site that sells the venue: rooms, event types, booking enquiries, and a way to capture leads that doesn't end in an inbox nobody reads. I built it as a prototype the marketing team can keep running without me.",
    tech: 'Webflow CMS holds the content model, so venues and events are entries rather than hand-built pages. On-page SEO covers metadata, heading structure, and how the content is organised. Python scripts pull competitor and locator data straight into the CMS instead of someone typing it in.',
    build:
      'I rebuilt the booking, inquiry, and newsletter paths so each one is a short route to a single form, and moved customer reviews onto the pages where people actually decide. Lead volume rose about 80%.',
  },
  revive: {
    intro:
      'Revive Pharmacy ran as one system where a single failure took everything with it. My job was to split it up, lock it down, and make deploying something we could do in the middle of the day.',
    tech: 'Node.js microservices on PostgreSQL and Redis, each able to deploy and fail on its own. Nginx sits in front on a Linux VPS with rate limiting and DDoS controls. Docker and Git run CI/CD directly on the VPS.',
    build:
      'I profiled the queries on the paths customers actually hit and added the indexes they were missing, cutting API response times about 40%. Automating the Docker pipeline cut deploy time about 75%.',
  },
  volatility: {
    intro:
      'Volatility sells trading education, and the whole funnel ran through a landing page and a webinar. Both had to convert, and the marketing team needed to change them without waiting on a pull request.',
    tech: 'React on the front end, built in Agile sprints against the marketing calendar. Strapi CMS wired into the frontend to power the blog with ongoing editorial updates. A video platform built to host recurring live events.',
    build:
      'I rebuilt the landing page around one call to action and shortened the path to signup, raising engagement and conversions about 22%. The video platform hosted the recurring live webinars the sales team ran.',
  },
  agentsly: {
    intro:
      'Agentsly puts an LLM in front of real customers, which makes the plumbing around the model matter as much as the prompt. I built the full-stack features and kept production up while people were using it.',
    tech: 'React and Node with Express REST APIs and GraphQL over PostgreSQL. The LLM work runs on the Vercel AI SDK and the OpenAI API. GoHighLevel is integrated so the team can track a lead from capture through follow-up.',
    build:
      'Rolling ShadCN UI patterns across the app cut frontend delivery time about 30%, because new screens stopped being built from scratch. Production ran on AWS and held 99.9% uptime across live user traffic.',
  },
  tapup: {
    intro:
      'TapUp is a card platform where an account is a card. It started as a developer card, somewhere to put your work and your links, and grew into something closer to a social network: profiles, portfolios, and connections between them.',
    tech: 'Next.js on the front and Firebase underneath, using auth, storage, and the database. Cards, portfolios, and social features all read from the same account model, so one profile can be shown as a card, a portfolio, or a feed entry.',
    build:
      'I ran scope and delivery as well as building. That meant agreeing what a card actually is, splitting it into work a team could build in parallel, and shipping the platform with them.',
  },
  codebility: {
    intro:
      'Codebility runs digital delivery teams, and the platform behind it manages both employees and clients. I worked on the platform and on the juniors building it.',
    tech: 'Next.js and TypeScript on the product, Jest for the tests, and code review on every pull request with the test scripts run before each merge.',
    build:
      'I improved Next.js rendering on the production pages and Core Web Vitals rose about 35%. Unit tests on the critical flows cut manual regression work about 50%.',
  },
}

export type ProjectBeat = {
  id: ProjectBeatId
  label: string
  body: string
}

export type ProjectStory = {
  id: string
  title: string
  role: string
  period: string
  domain?: string
  stack: string[]
  beats: ProjectBeat[]
  /** Every shot for the project, in order — the stage crossfades through these */
  shots: ClientWork[]
}

const shotsBySlug = new Map(clientWorkGroups.map((g) => [g.key, g.shots]))
const roleByCompany = new Map(experience.map((e) => [e.company, e]))

function toStory(project: Project): ProjectStory | null {
  const copy = STORIES[project.id]
  if (!copy) return null
  const role = roleByCompany.get(project.title)
  return {
    id: project.id,
    title: project.title,
    role: role?.role ?? '',
    period: role?.period ?? '',
    domain: project.domain,
    stack: project.skills,
    shots: shotsBySlug.get(project.slug) ?? [],
    beats: BEAT_ORDER.map((id) => ({ id, label: BEAT_LABELS[id], body: copy[id] })),
  }
}

export const projectStories: ProjectStory[] = projects
  .map(toStory)
  .filter((s): s is ProjectStory => s !== null)

/** Flat beat list in scroll order — one `100vh` beat each. */
export const projectBeats = projectStories.flatMap((story, storyIndex) =>
  story.beats.map((beat, beatIndex) => ({ story, beat, storyIndex, beatIndex })),
)
