import { brainHotspots } from './brainCloud'

export const SECTION_IDS = ['about', 'experience', 'projects', 'skills', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export interface SectionDef {
  id: SectionId
  label: string
  position: [number, number, number]
  cameraOffset: [number, number, number]
  /**
   * Reach of the section's region on the brain surface. Every node takes the
   * colour of the nearest hotspot whose sphere contains it, so this is what
   * draws the five coloured areas: widen it and the area claims more cortex,
   * shrink it and the brain falls back to its own tissue palette.
   */
  radius: number
  color: string
}

// Hotspots derived from anatomical brain scan mesh (see brainCloud.ts)
// Order matches SECTION_IDS — journey scroll visits in this sequence
export const sections: SectionDef[] = [
  {
    id: 'about',
    label: 'About',
    position: [...brainHotspots.about] as [number, number, number],
    cameraOffset: [-1.55, 0.55, 5.4],
    radius: 1.9,
    color: '#35e0c8',
  },
  {
    id: 'experience',
    label: 'Experience',
    position: [...brainHotspots.experience] as [number, number, number],
    cameraOffset: [-1.85, 0.8, 5.1],
    radius: 1.9,
    color: '#ff5c9e',
  },
  {
    id: 'projects',
    label: 'Projects',
    position: [...brainHotspots.projects] as [number, number, number],
    cameraOffset: [1.85, 0.7, 5.0],
    radius: 2.0,
    color: '#7ee08a',
  },
  {
    id: 'skills',
    label: 'Skills',
    position: [...brainHotspots.skills] as [number, number, number],
    cameraOffset: [1.75, -0.18, 4.9],
    radius: 2.0,
    color: '#4da6ff',
  },
  {
    id: 'contact',
    label: 'Contact',
    position: [...brainHotspots.contact] as [number, number, number],
    cameraOffset: [0.5, -1.1, 5.2],
    radius: 1.7,
    color: '#ffb85c',
  },
]
