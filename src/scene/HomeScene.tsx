import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Vector2, Color } from 'three'
import { QUALITY } from '../lib/quality'
import { NODE_LIMITS } from '../lib/nodes'
import { getAccent, accentHex } from '../lib/accent'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { traceStages } from '../content/requestTrace'
import { uniforms, mouse, clusterState, setPointerOnScene } from './shared'
import { sceneFraming } from '../lib/framing'
import { NeuralCluster, makeCloud } from './NeuralCluster'
import { ConnectionSystem } from './ConnectionSystem'
import { CameraRig } from './CameraRig'
import { PostProcessing } from './PostProcessing'
import { IntroSequence } from './IntroSequence'
import { AmbientParticles } from './AmbientParticles'
import { BrainTouchProbe } from './BrainTouch'
import { CameraFraming, SceneDebugBridge } from './SceneDebugBridge'

const tmpMouse = new Vector2()
let frame = 0

/** Brain hotspot a trace stage rides on. */
const traceHotspot = (stage: number) =>
  SECTION_IDS.indexOf(traceStages[stage]?.hotspot ?? SECTION_IDS[0])

function SceneUniforms() {
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    uniforms.uTime.value = t
    getAccent(t, uniforms.uAccent.value as Color)
    uniforms.uMouse.value.lerp(tmpMouse.set(mouse.x, mouse.y), 0.05)
    const s = useSceneStore.getState()
    // The trace lights the lobe its stage rides on
    uniforms.uActive.value =
      s.scrollZone === 'hero' || s.traceStage == null ? -1 : traceHotspot(s.traceStage)
    if ((frame++ & 31) === 0) document.documentElement.style.setProperty('--accent', accentHex(t))
  })
  return null
}

function SceneBoot() {
  const { gl } = useThree()
  const tier = useSceneStore((s) => s.qualityTier)
  const cfg = QUALITY[tier]

  useEffect(() => {
    gl.setPixelRatio(Math.min(devicePixelRatio, cfg.dpr))
    useSceneStore.getState().setSceneReady()
  }, [gl, cfg.dpr])

  return null
}

function ClusterGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  const tier = useSceneStore((s) => s.qualityTier)
  useEffect(() => {
    clusterState.group = ref.current
    return () => { clusterState.group = null }
  }, [])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const clusterScale = sceneFraming(tier).clusterScale
    const t = uniforms.uTime.value
    g.rotation.y = clusterState.rotation
    g.rotation.x = Math.sin(t * 0.13) * 0.02 + Math.sin(t * 0.071 + 2.0) * 0.012
    g.rotation.z = Math.sin(t * 0.094 + 1.2) * 0.016
    g.position.set(
      Math.sin(t * 0.16 + 0.7) * 0.03,
      Math.sin(t * 0.21) * 0.05 + Math.sin(t * 0.34 + 1.5) * 0.02,
      0,
    )
    const breath = 1 + Math.sin(t * 0.24) * 0.008 + Math.sin(t * 0.11 + 3.0) * 0.005
    g.scale.setScalar(clusterScale * breath)
    g.updateMatrixWorld()
  })
  return <group ref={ref}>{children}</group>
}

function BrainScene({ pool }: { pool: number }) {
  const cloud = useMemo(() => makeCloud(pool), [pool])
  useEffect(() => {
    const s = useSceneStore.getState()
    uniforms.uNodeCount.value = s.nodeCount
    if (s.loadPhase === 'ready') {
      uniforms.uSpawn.value = 1
      uniforms.uSliderSpawn.value = 1
      uniforms.uRevealFrom.value = 0
      uniforms.uConnect.value = 1
    }
  }, [pool])
  return (
    <ClusterGroup>
      <BrainTouchProbe />
      <NeuralCluster cloud={cloud} />
      <ConnectionSystem cloud={cloud} />
    </ClusterGroup>
  )
}

export function HomeScene({ paused = false }: { paused?: boolean }) {
  const tier = useSceneStore((s) => s.qualityTier)
  const cfg = QUALITY[tier]
  const pool = NODE_LIMITS[tier].pool
  const framing = sceneFraming(tier)

  useEffect(() => {
    // elementFromPoint forces a hit test, so it runs at most once a frame
    // rather than once per pointer event
    let pending = false
    let px = 0
    let py = 0
    const test = () => {
      pending = false
      const el = document.elementFromPoint(px, py)
      setPointerOnScene(!el?.closest(
        '.indicator, [data-testid="node-slider"], .panel, [data-testid="sector-nav"], .journey-progress, .cover-section, .project-journey, .scroll-end',
      ))
    }
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1
      mouse.y = -((e.clientY / innerHeight) * 2 - 1)
      px = e.clientX
      py = e.clientY
      if (pending) return
      pending = true
      requestAnimationFrame(test)
    }
    addEventListener('pointermove', onMove)
    return () => removeEventListener('pointermove', onMove)
  }, [])

  return (
    <Canvas
      dpr={[1, cfg.dpr]}
      // 'never' stops the render loop without tearing down the WebGL context
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [framing.cam.x, framing.cam.y, framing.cam.z], fov: framing.fov, near: 0.1, far: 80 }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#020204')
        camera.lookAt(0, 0, 0)
        const onLost = (e: Event) => e.preventDefault()
        gl.domElement.addEventListener('webglcontextlost', onLost)
      }}
    >
      <SceneBoot />
      <SceneUniforms />
      <CameraFraming />
      <SceneDebugBridge />
      <AmbientParticles />
      <BrainScene key={pool} pool={pool} />
      <IntroSequence />
      <CameraRig />
      <PostProcessing />
    </Canvas>
  )
}
