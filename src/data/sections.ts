export const SECTION_IDS = ['projects', 'experience', 'skills', 'about', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export interface SectionDef {
  id: SectionId
  label: string
  position: [number, number, number]
  cameraOffset: [number, number, number]
  radius: number
  color: string
}

export const sections: SectionDef[] = [
  { id: 'projects', label: 'Projects', position: [2.1, 0.7, 0.5], cameraOffset: [1.3, 0.5, 3.1], radius: 0.9, color: '#7c5cff' },
  { id: 'experience', label: 'Experience', position: [-2.0, 1.0, -0.5], cameraOffset: [-1.2, 0.6, 3.2], radius: 0.85, color: '#ff5c9e' },
  { id: 'skills', label: 'Skills', position: [0.4, -1.5, 1.1], cameraOffset: [0.4, -0.6, 3.1], radius: 0.9, color: '#4da6ff' },
  { id: 'about', label: 'About', position: [-1.3, -0.8, 1.0], cameraOffset: [-1.0, -0.4, 3.0], radius: 0.8, color: '#35e0c8' },
  { id: 'contact', label: 'Contact', position: [1.1, 1.6, -0.9], cameraOffset: [0.9, 0.8, 3.3], radius: 0.8, color: '#ffb85c' },
]
