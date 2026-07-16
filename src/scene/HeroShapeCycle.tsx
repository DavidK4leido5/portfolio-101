import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { QUALITY } from '../lib/quality'
import { startHeroReel, stopHeroReel } from './heroReel'

/** Idle hero loop — syncs shape morph uniforms with HeroTypography reel. */
export function HeroShapeCycle() {
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const phase = useSceneStore((s) => s.phase)
  const tier = useSceneStore((s) => s.qualityTier)

  useEffect(() => {
    if (loadPhase !== 'ready' || phase !== 'idle') {
      stopHeroReel()
      return
    }
    startHeroReel(QUALITY[tier].heroShapeMorph)
    return () => stopHeroReel()
  }, [loadPhase, phase, tier])

  return null
}
