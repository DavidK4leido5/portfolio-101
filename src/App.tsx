import { useEffect } from 'react'
import { HomeScene } from './scene/HomeScene'
import { PortfolioUI } from './ui/PortfolioUI'
import { LoadingScreen } from './ui/LoadingScreen'
import { HeroTypography } from './ui/HeroTypography'
import { detectTier } from './lib/quality'
import { useSceneStore } from './store/sceneStore'

export default function App() {
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const tier = useSceneStore((s) => s.qualityTier)

  useEffect(() => {
    let to: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(to)
      to = setTimeout(() => useSceneStore.getState().setTier(detectTier()), 250)
    }
    addEventListener('resize', onResize)
    return () => { clearTimeout(to); removeEventListener('resize', onResize) }
  }, [])

  useEffect(() => {
    if (!sceneReady || loadPhase !== 'loading') return
    const t = setTimeout(() => useSceneStore.getState().startIntro(), 1500)
    return () => clearTimeout(t)
  }, [sceneReady, loadPhase])

  return (
    <div className="app-root" data-quality-tier={tier}>
      <div className="app-scene">
        <HomeScene />
      </div>
      <HeroTypography />
      <LoadingScreen />
      <PortfolioUI />
    </div>
  )
}
