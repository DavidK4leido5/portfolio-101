import { SECTION_IDS } from '../data/sections'

/**
 * The hero scroll journey: one request traced through the brain, stage by
 * stage, as a way of saying "full stack" without writing the words again.
 *
 * Each stage rides one of the brain's five hotspots, so the camera flight and
 * the lobe highlight are the ones the scene already knows how to do. Stage `i`
 * lights hotspot `i` — reorder this list and the flight path reorders with it.
 *
 * Edit the copy freely. Keep `stack` to four entries or fewer: it is set as one
 * line under the headline and wraps badly past that.
 */

/** Where the stage's giant ghost word lands in the frame. */
export type GhostPlace =
  | 'top-left'
  | 'top-right'
  | 'left'
  | 'right'
  | 'center'
  | 'bottom-right'

/**
 * Baked point clouds the node field can take the form of, from
 * `src/data/shapeClouds.ts`. The trace morphs between them as it descends the
 * layers: the mind at the surface, a distributed network in the middle, a
 * literal tiered stack at the floor. Consecutive stages sharing a shape simply
 * hold it, which is what keeps the morphs meaningful instead of restless.
 */
export type StageShape = 'brain' | 'network' | 'stack'

export const SHAPE_ID: Record<StageShape, number> = {
  brain: 0,
  network: 1,
  stack: 2,
}

export interface TraceStage {
  /** Matches the brain hotspot it lights up. */
  hotspot: (typeof SECTION_IDS)[number]
  /** The layer name. Set huge and low-contrast as the stage's ghost word. */
  title: string
  /** Sentence-case line for the corner block. */
  headline: string
  /** One or two sentences. What this layer is responsible for. */
  lede: string
  stack: string[]
  /** Baked cloud the node field takes on for this stage. */
  shape: StageShape
  /**
   * Position of the ghost word. Vary it stage to stage — the whole point is
   * that it turns up somewhere new each time rather than sitting in a slot.
   */
  place: GhostPlace
  /** Multiplier on the ghost's fitted size, for a stage that wants more shout. */
  ghostScale?: number
}

export const traceOpening = {
  kicker: 'One request, end to end',
  note: 'Scroll to follow it through',
}

export const traceStages: TraceStage[] = [
  {
    hotspot: 'about',
    title: 'Interface',
    headline: 'What the person touches.',
    lede: 'Typed components, real loading states, and pages that stay fast on the connection people really have.',
    stack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    shape: 'brain',
    place: 'top-left',
  },
  {
    hotspot: 'projects',
    title: 'API',
    headline: 'The contract in the middle.',
    lede: 'Predictable shapes, honest status codes, and errors a client can actually act on.',
    stack: ['Node.js', 'Express', 'REST', 'GraphQL'],
    shape: 'network',
    place: 'right',
  },
  {
    hotspot: 'experience',
    title: 'Service',
    headline: 'Where the work happens.',
    lede: 'Services that deploy and fail independently, with rate limiting in front so one caller cannot take the rest down.',
    stack: ['Next.js', 'FastAPI', 'Queues', 'Rate limiting'],
    shape: 'network',
    place: 'center',
  },
  {
    hotspot: 'skills',
    title: 'Data',
    headline: 'The part you cannot redo.',
    lede: 'Schemas designed before the first insert, indexes that match the reads, and a cache that knows when to let go.',
    stack: ['PostgreSQL', 'Redis', 'MySQL', 'Prisma'],
    shape: 'stack',
    place: 'top-right',
    ghostScale: 0.8,
  },
  {
    hotspot: 'contact',
    title: 'Infrastructure',
    headline: 'The floor it stands on.',
    lede: 'Containers, a reverse proxy that terminates TLS, and a pipeline that ships on green and nothing else.',
    stack: ['Docker', 'Nginx', 'Linux', 'GitHub Actions'],
    shape: 'stack',
    place: 'bottom-right',
    // Fourteen letters: at full size only the middle of the word is in frame
    ghostScale: 0.58,
  },
]

export const TRACE_COUNT = traceStages.length
