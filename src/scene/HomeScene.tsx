import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Vector2, Vector3, Color } from 'three'
import { QUALITY } from '../lib/quality'
import { getAccent, accentHex } from '../lib/accent'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { uniforms, mouse, clusterState, hotspotWorld, indicatorEls } from './shared'
import { NeuralCluster, makeCloud } from './NeuralCluster'
import { ConnectionSystem, Constellation } from './ConnectionSystem'
import { CameraRig } from './CameraRig'
import { PostProcessing } from './PostProcessing'

const tmpMouse = new Vector2()
let frame = 0

function SceneUniforms() {
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    uniforms.uTime.value = t
    getAccent(t, uniforms.uAccent.value as Color)
    uniforms.uMouse.value.lerp(tmpMouse.set(mouse.x, mouse.y), 0.05)
    const s = useSceneStore.getState()
    uniforms.uHovered.value = s.hoveredSection ? SECTION_IDS.indexOf(s.hoveredSection) : -1
    uniforms.uActive.value = s.activeSection ? SECTION_IDS.indexOf(s.activeSection) : -1
    if (s.phase === 'idle') {
      const target = s.hoveredSection ? 0.72 : 0
      uniforms.uDim.value += (target - uniforms.uDim.value) * 0.08
    }
    if ((frame++ & 31) === 0) document.documentElement.style.setProperty('--accent', accentHex(t))
  })
  return null
}

const projV = new Vector3()

function Projection() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    if (frame & 1) return
    for (let i = 0; i < sections.length; i++) {
      const el = indicatorEls[i]
      if (!el) continue
      hotspotWorld(i, projV).project(camera)
      el.style.opacity = projV.z > 1 ? '0' : ''
      el.style.left = `${(projV.x * 0.5 + 0.5) * size.width}px`
      el.style.top = `${(-projV.y * 0.5 + 0.5) * size.height}px`
    }
  })
  return null
}

// The whole core moves as one body: layered incommensurate sines give a
// non-repeating organic sway/bob/breath. Per-node motion stays in the shader.
function ClusterGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useEffect(() => {
    clusterState.group = ref.current
    return () => { clusterState.group = null }
  }, [])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = uniforms.uTime.value
    g.rotation.y = clusterState.rotation
    g.rotation.x = Math.sin(t * 0.13) * 0.02 + Math.sin(t * 0.071 + 2.0) * 0.012
    g.rotation.z = Math.sin(t * 0.094 + 1.2) * 0.016
    g.position.set(
      Math.sin(t * 0.16 + 0.7) * 0.05,
      Math.sin(t * 0.21) * 0.08 + Math.sin(t * 0.34 + 1.5) * 0.03,
      0,
    )
    g.scale.setScalar(1 + Math.sin(t * 0.24) * 0.012 + Math.sin(t * 0.11 + 3.0) * 0.008)
    g.updateMatrixWorld()
  })
  return <group ref={ref}>{children}</group>
}

function Dust({ count }: { count: number }) {
  const positions = useMemo(() => {
    const p = new Float32Array(Math.max(count, 1) * 3)
    for (let i = 0; i < p.length; i++) p[i] = (Math.random() - 0.5) * 14
    return p
  }, [count])
  if (!count) return null
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} sizeAttenuation transparent opacity={0.22} color="#8899bb" depthWrite={false} />
    </points>
  )
}

export function HomeScene() {
  const tier = useSceneStore((s) => s.qualityTier)
  const cfg = QUALITY[tier]
  const cloud = useMemo(() => makeCloud(cfg.particles), [cfg])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / innerWidth) * 2 - 1
      mouse.y = -((e.clientY / innerHeight) * 2 - 1)
    }
    addEventListener('pointermove', onMove)
    return () => removeEventListener('pointermove', onMove)
  }, [])

  return (
    <Canvas
      key={tier}
      dpr={[1, cfg.dpr]}
      camera={{ position: [0, 0.5, 8.5], fov: 50, near: 0.1, far: 60 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor('#020204')
        camera.lookAt(0, 0, 0)
      }}
    >
      <SceneUniforms />
      <ClusterGroup>
        <NeuralCluster cloud={cloud} />
        <ConnectionSystem cloud={cloud} />
        <Constellation cloud={cloud} />
      </ClusterGroup>
      <Dust count={cfg.dust} />
      <gridHelper args={[36, 48, '#1c2033', '#151827']} position={[0, -3.4, 0]} material-transparent material-opacity={0.35} />
      <CameraRig />
      <Projection />
      <PostProcessing />
    </Canvas>
  )
}
