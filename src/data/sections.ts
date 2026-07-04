export const SECTION_IDS = ['projects', 'experience', 'skills', 'about', 'contact'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export interface SectionDef {
  id: SectionId
  label: string
  position: [number, number, number]
  cameraOffset: [number, number, number]
  radius: number
}

export const sections: SectionDef[] = [
  { id: 'projects', label: 'Projects', position: [2.1, 0.7, 0.5], cameraOffset: [1.1, 0.4, 2.4], radius: 0.9 },
  { id: 'experience', label: 'Experience', position: [-2.0, 1.0, -0.5], cameraOffset: [-1.0, 0.5, 2.5], radius: 0.85 },
  { id: 'skills', label: 'Skills', position: [0.4, -1.5, 1.1], cameraOffset: [0.3, -0.5, 2.4], radius: 0.9 },
  { id: 'about', label: 'About', position: [-1.3, -0.8, 1.0], cameraOffset: [-0.8, -0.3, 2.3], radius: 0.8 },
  { id: 'contact', label: 'Contact', position: [1.1, 1.6, -0.9], cameraOffset: [0.7, 0.7, 2.6], radius: 0.8 },
]
