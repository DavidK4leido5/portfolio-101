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
  const phase = useSceneStore((s) => s.phase)
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

  // Lock page scroll until labels finish cascading, and while a sector modal is up
  const scrollLocked =
    loadPhase !== 'ready' || phase === 'arrived' || phase === 'travel'

  useEffect(() => {
    if (!scrollLocked) return

    const html = document.documentElement
    const body = document.body
    const y = window.scrollY
    const p = useSceneStore.getState().phase
    const modalOpen = p === 'arrived' || p === 'travel'

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    // iOS: pin body so rubber-band can't shift the page under the modal
    if (modalOpen) {
      body.style.position = 'fixed'
      body.style.top = `-${y}px`
      body.style.width = '100%'
    }

    return () => {
      const pinned = body.style.position === 'fixed'
      const top = body.style.top
      html.style.overflow = ''
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
      if (pinned) {
        const restore = Math.abs(parseInt(top || '0', 10)) || 0
        window.scrollTo(0, restore)
      }
    }
  }, [scrollLocked])

  return (
    <div
      className="app-root"
      data-quality-tier={tier}
      data-scroll-zone={scrollZone}
      data-load-phase={loadPhase}
      data-modal={phase === 'arrived' || phase === 'travel' ? 'open' : 'closed'}
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
