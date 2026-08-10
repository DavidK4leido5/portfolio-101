import { useEffect } from 'react'
import { useSceneStore } from './store/sceneStore'
import { HomeScene } from './scene/HomeScene'
import { PortfolioUI } from './ui/PortfolioUI'
import { LoadingScreen } from './ui/LoadingScreen'
import { HeroTypography } from './ui/HeroTypography'
import { ScrollDriver } from './scroll/ScrollDriver'
import { detectTier } from './lib/quality'

export default function App() {
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const tier = useSceneStore((s) => s.qualityTier)
  const scrollZone = useSceneStore((s) => s.scrollZone)

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

  useEffect(() => {
    const lock = loadPhase === 'loading'
    document.documentElement.style.overflow = lock ? 'hidden' : ''
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [loadPhase])

  return (
    <div
      className="app-root"
      data-quality-tier={tier}
      data-scroll-zone={scrollZone}
      data-load-phase={loadPhase}
    >
      <div className="app-scene" data-testid="app-scene">
        <div className="app-scene-parallax" data-testid="app-scene-parallax">
          <HomeScene />
        </div>
      </div>
      <ScrollDriver />
      <HeroTypography />
      <LoadingScreen />
      <PortfolioUI />
    </div>
  )
}
