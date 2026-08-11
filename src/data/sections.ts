import { brainHotspots } from './brainCloud'

export const SECTION_IDS = ['about', 'projects', 'experience', 'skills', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export interface SectionDef {
  id: SectionId
  label: string
  position: [number, number, number]
  cameraOffset: [number, number, number]
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
    radius: 0.9,
    color: '#35e0c8',
  },
  {
    id: 'projects',
    label: 'Projects',
    position: [...brainHotspots.projects] as [number, number, number],
    cameraOffset: [1.85, 0.7, 5.0],
    radius: 0.95,
    color: '#7c5cff',
  },
  {
    id: 'experience',
    label: 'Experience',
    position: [...brainHotspots.experience] as [number, number, number],
    cameraOffset: [-1.85, 0.8, 5.1],
    radius: 0.9,
    color: '#ff5c9e',
  },
  {
    id: 'skills',
    label: 'Skills',
    position: [...brainHotspots.skills] as [number, number, number],
    cameraOffset: [1.75, -0.18, 4.9],
    radius: 0.95,
    color: '#4da6ff',
  },
  {
    id: 'contact',
    label: 'Contact',
    position: [...brainHotspots.contact] as [number, number, number],
    cameraOffset: [0.5, -1.1, 5.2],
    radius: 0.85,
    color: '#ffb85c',
  },
]
