import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Raycaster, Vector2, Vector3 } from 'three'
import { mouse, pointerOnScene, uniforms, clusterState } from './shared'
import { useSceneStore } from '../store/sceneStore'

const raycaster = new Raycaster()
const ndc = new Vector2()
const localHit = new Vector3()

/** Invisible proxy — ray hit ≈ cursor over the node cloud (local cluster space). */
export function BrainTouchProbe() {
  const meshRef = useRef<Mesh>(null)
  const { camera } = useThree()

  useFrame((_, delta) => {
    const { loadPhase, phase, scrollZone } = useSceneStore.getState()
    const canTouch = loadPhase === 'ready' && phase === 'idle' && scrollZone === 'hero' && pointerOnScene
    let target = 0

    if (canTouch && meshRef.current) {
      ndc.set(mouse.x, mouse.y)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(meshRef.current, false)
      if (hits.length > 0) {
        localHit.copy(hits[0].point)
        if (clusterState.group) clusterState.group.worldToLocal(localHit)
        uniforms.uTouchPos.value.copy(localHit)
        target = 0.62
      }
    }

    const touch = uniforms.uTouch.value
    uniforms.uTouch.value = touch + (target - touch) * Math.min(1, delta * 5)
  })

  return (
    <mesh ref={meshRef} visible={false} position={[0, 0.12, 0]}>
      <sphereGeometry args={[3.35, 20, 16]} />
      <meshBasicMaterial />
    </mesh>
  )
}
