import { useEffect } from 'react'
import { useSceneStore } from './store/sceneStore'
import { HomeScene } from './scene/HomeScene'
import { PortfolioUI } from './ui/PortfolioUI'
import { LoadingScreen } from './ui/LoadingScreen'
import { HeroMark } from './ui/HeroMark'
import { ScrollDriver } from './scroll/ScrollDriver'
import { useSceneVisibility } from './scene/useSceneVisibility'
import { detectTier } from './lib/quality'

export default function App() {
  const sceneReady = useSceneStore((s) => s.sceneReady)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const tier = useSceneStore((s) => s.qualityTier)
  const scrollZone = useSceneStore((s) => s.scrollZone)
  // Brain stage stops rendering once the cover paints over it, then unmounts if
  // the user stays down there. See useSceneVisibility.
  const sceneState = useSceneVisibility('[data-testid="scene-cover-sentinel"]')

  /*
   * Own the scroll position on load. Every visual state on this page is
   * scrubbed from scroll, so restoring the browser's remembered offset drops
   * the reader into the middle of the trace with the intro sequence still
   * running and the mask still closed — a worse first frame than the top.
   */
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

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

  // Hold the page still until the sector labels finish cascading in
  useEffect(() => {
    if (loadPhase === 'ready') return
    const html = document.documentElement
    const body = document.body
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [loadPhase])

  return (
    <div
      className="app-root"
      data-quality-tier={tier}
      data-scroll-zone={scrollZone}
      data-load-phase={loadPhase}
      data-scene-state={sceneState}
    >
      <div className="app-scene" data-testid="app-scene">
        {sceneState !== 'off' && <HomeScene paused={sceneState === 'paused'} />}
      </div>
      <ScrollDriver />
      <HeroMark />
      <LoadingScreen />
      <PortfolioUI />
    </div>
  )
}
