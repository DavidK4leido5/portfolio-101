import { useEffect } from 'react'
import { HomeScene } from './scene/HomeScene'
import { PortfolioUI } from './ui/PortfolioUI'
import { detectTier } from './lib/quality'
import { useSceneStore } from './store/sceneStore'

export default function App() {
  useEffect(() => {
    let to: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(to)
      to = setTimeout(() => useSceneStore.getState().setTier(detectTier()), 250)
    }
    addEventListener('resize', onResize)
    return () => { clearTimeout(to); removeEventListener('resize', onResize) }
  }, [])

  return (
    <>
      <HomeScene />
      <PortfolioUI />
    </>
  )
}
