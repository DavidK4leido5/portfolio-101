import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, Vector2, Vector3, Color } from 'three'
import { QUALITY } from '../lib/quality'
import { getAccent, accentHex } from '../lib/accent'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { CAM_BASE, CLUSTER_SCALE, uniforms, mouse, clusterState, hotspotWorld, indicatorEls } from './shared'
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
const MIN_IND_GAP = 118

function separateIndicators(pts: { x: number; y: number }[]) {
  for (let pass = 0; pass < 6; pass++) {
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        const dx = pts[b].x - pts[a].x
        const dy = pts[b].y - pts[a].y
        const d = Math.hypot(dx, dy)
        if (d >= MIN_IND_GAP || d < 1) continue
        const push = (MIN_IND_GAP - d) * 0.55
        const nx = dx / d
        const ny = dy / d
        pts[a].x -= nx * push
        pts[a].y -= ny * push
        pts[b].x += nx * push
        pts[b].y += ny * push
      }
    }
  }
}

function Projection() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    if (frame & 1) return
    const pts = sections.map((_, i) => {
      hotspotWorld(i, projV).project(camera)
      return {
        i,
        hide: projV.z > 1,
        x: (projV.x * 0.5 + 0.5) * size.width,
        y: (-projV.y * 0.5 + 0.5) * size.height,
      }
    })
    separateIndicators(pts)
    const pad = 96
    for (const p of pts) {
      p.x = Math.max(pad, Math.min(size.width - pad, p.x))
      p.y = Math.max(pad, Math.min(size.height - pad, p.y))
    }
    for (const p of pts) {
      const el = indicatorEls[p.i]
      if (!el) continue
      el.style.opacity = p.hide ? '0' : ''
      el.style.pointerEvents = p.hide ? 'none' : 'auto'
      el.style.zIndex = String(20 - p.i)
      el.style.left = `${p.x}px`
      el.style.top = `${p.y}px`
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
      Math.sin(t * 0.16 + 0.7) * 0.03,
      Math.sin(t * 0.21) * 0.05 + Math.sin(t * 0.34 + 1.5) * 0.02,
      0,
    )
    const breath = 1 + Math.sin(t * 0.24) * 0.008 + Math.sin(t * 0.11 + 3.0) * 0.005
    g.scale.setScalar(CLUSTER_SCALE * breath)
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
      <pointsMaterial size={0.03} sizeAttenuation transparent opacity={0.16} color="#7788aa" depthWrite={false} />
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
      camera={{ position: [CAM_BASE.x, CAM_BASE.y, CAM_BASE.z], fov: 49, near: 0.1, far: 80 }}
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
      <gridHelper args={[42, 52, '#1c2033', '#151827']} position={[0, -4.6, 0]} material-transparent material-opacity={0.3} />
      <CameraRig />
      <Projection />
      <PostProcessing />
    </Canvas>
  )
}
