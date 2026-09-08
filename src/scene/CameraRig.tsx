import { useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Camera } from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections, type SectionId } from '../data/sections'
import { SHAPE_ID, traceStages } from '../content/requestTrace'
import { clusterState, hotspotWorld, rotateY, uniforms } from './shared'
import { sceneFraming } from '../lib/framing'

gsap.ticker.lagSmoothing(0)

const ORIGIN = new Vector3()
const FRONT = new Vector3(0, 0, 1)
const tmpPos = new Vector3()
const tmpOff = new Vector3()
const tmpDest0 = new Vector3()
const tmpDest1 = new Vector3()
const tmpLook0 = new Vector3()
const tmpLook1 = new Vector3()
const tmpCam = new Vector3()
const tmpLook = new Vector3()
const tmpHotspot = new Vector3()
const tmpDir = new Vector3()

/** Rate the camera closes on the scrubbed target. Higher tracks tighter. */
const CAMERA_FOLLOW = 9
/** How much of the home distance the trace keeps. Under 1 pushes in a little. */
const TRACE_RADIUS = 0.94

/** Shape each waypoint settles on: 0 is the home framing, 1..N are the stages. */
const WAYPOINT_SHAPE = [
  SHAPE_ID.brain,
  ...traceStages.map((stage) => SHAPE_ID[stage.shape]),
]

/**
 * Morph the node field between baked clouds as the trace descends the layers.
 *
 * `uShapeAlt` carries how far the blend currently is from the brain. The
 * connection lines are wired from brain-space neighbours, so once the cloud
 * takes another form those pairs are no longer near each other and the mesh
 * turns into a web stretched across the whole shape — the shader fades the
 * lines out on this value. It cannot be derived from `uShapeMorph` alone,
 * because holding a shape across two stages, or morphing straight from one
 * non-brain shape to another, both sit at morph 0 while still being fully off
 * the brain.
 */
function writeStageShape(i0: number, i1: number, f: number) {
  const from = WAYPOINT_SHAPE[Math.min(i0, WAYPOINT_SHAPE.length - 1)]
  const to = WAYPOINT_SHAPE[Math.min(i1, WAYPOINT_SHAPE.length - 1)]
  // Holding one shape across two stages has to read as morph 0, since the
  // shader short-circuits to the `from` cloud there
  const morph = from === to ? 0 : f
  const offBrain = (shape: number) => (shape === SHAPE_ID.brain ? 0 : 1)
  uniforms.uShapeFrom.value = from
  uniforms.uShapeTo.value = to
  uniforms.uShapeMorph.value = morph
  uniforms.uShapeAlt.value = offBrain(from) + (offBrain(to) - offBrain(from)) * morph
}
/** Damping on the hotspot's vertical component, so no stage looks steeply down. */
const TRACE_PITCH_DAMP = 0.5
/**
 * How far each stage's viewpoint is pulled back toward front-on. The lobe
 * direction alone swings the camera far enough round that the baked network
 * and stack clouds are seen edge-on and stop reading as anything — the stack
 * in particular only announces itself as tiers from near the front.
 */
const TRACE_FRONT_BIAS = 0.55

/**
 * Orbit to the lobe's side of the brain and look at the brain's centre.
 *
 * The trace used to fly the camera to a close-up of each lobe and aim 1.15
 * units to its right, which cropped the brain into an abstract cloud in the
 * right two thirds of the frame — it stopped reading as a brain at all, and
 * the offset only existed to clear space for a section panel that no longer
 * docks there. Standing off at roughly the home distance on the lobe's own
 * side turns the lit region toward the camera while the whole brain stays in
 * frame and centred, which is what leaves room around it for the stage's word.
 */
function writeStageCamera(id: SectionId, destOut: Vector3, lookOut: Vector3, tier: Parameters<typeof sceneFraming>[0]) {
  const home = sceneFraming(tier).cam
  hotspotWorld(SECTION_IDS.indexOf(id), tmpHotspot)
  tmpDir.copy(tmpHotspot)
  tmpDir.y *= TRACE_PITCH_DAMP
  if (tmpDir.lengthSq() < 1e-6) tmpDir.set(0, 0, 1)
  tmpDir.normalize().lerp(FRONT, TRACE_FRONT_BIAS).normalize()
  destOut.copy(tmpDir).multiplyScalar(home.z * TRACE_RADIUS)
  lookOut.set(0, 0, 0)
}

/** Waypoint 0 = home framing; 1..N = trace stages */
function writeWaypoint(index: number, destOut: Vector3, lookOut: Vector3, tier: Parameters<typeof sceneFraming>[0]) {
  if (index <= 0) {
    const home = sceneFraming(tier).cam
    destOut.set(home.x, home.y, home.z)
    lookOut.set(0, 0, 0)
    return
  }
  writeStageCamera(SECTION_IDS[index - 1], destOut, lookOut, tier)
}

function idleOrbit(
  camera: Camera,
  lookRef: MutableRefObject<Vector3>,
  delta: number,
  amp = 1,
) {
  clusterState.rotation += delta * 0.015 * amp
  const t = uniforms.uTime.value
  const base = sceneFraming(useSceneStore.getState().qualityTier).cam
  tmpPos.set(
    base.x + Math.sin(t * 0.11) * 0.35 * amp + uniforms.uMouse.value.x * 0.5 * amp,
    base.y + Math.sin(t * 0.17 + 1.3) * 0.25 * amp + uniforms.uMouse.value.y * 0.3 * amp,
    base.z + Math.sin(t * 0.07 + 2.1) * 0.3 * amp,
  )
  camera.position.lerp(tmpPos, 0.035)
  lookRef.current.lerp(ORIGIN, 0.05)
  camera.lookAt(lookRef.current)
}

/**
 * Two states, both driven by scroll: the hero orbits the brain, and the trace
 * lerps the camera along home → stage0 → … → stageN from `traceProgress`.
 * Nothing else moves the camera, so there is no timeline to fight the scrub.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const lookRef = useRef(new Vector3())

  useFrame((_, delta) => {
    const s = useSceneStore.getState()
    if (s.loadPhase !== 'ready') return

    if (s.scrollZone === 'trace' || s.scrollZone === 'sections') {
      const n = SECTION_IDS.length
      const t = Math.min(1, Math.max(0, s.traceProgress)) * n
      const clamped = Math.min(t, n - 1e-6)
      const i0 = Math.floor(clamped)
      const i1 = Math.min(n, i0 + 1)
      const f = clamped - i0

      writeWaypoint(i0, tmpDest0, tmpLook0, s.qualityTier)
      writeWaypoint(i1, tmpDest1, tmpLook1, s.qualityTier)
      tmpCam.lerpVectors(tmpDest0, tmpDest1, f)
      tmpLook.lerpVectors(tmpLook0, tmpLook1, f)

      /*
       * Follow the scrubbed target instead of snapping onto it. Writing the
       * position directly meant the handover from the hero's idle orbit was a
       * hard cut — the orbit had wandered off home and the trace put the
       * camera back on it in a single frame. A short time constant settles
       * exactly on the target during a stage's hold and only trails during a
       * fast scroll, which is the right way round.
       */
      const follow = 1 - Math.exp(-delta * CAMERA_FOLLOW)
      camera.position.lerp(tmpCam, follow)
      lookRef.current.lerp(tmpLook, follow)
      camera.lookAt(lookRef.current)

      writeStageShape(i0, i1, f)

      // Soft at home (i0===0), stronger lobe focus near stage centres
      const atHome = i0 === 0 ? 1 - f : 0
      const nearness = 1 - Math.abs(f - 0.5) * 2
      const focusAmt = atHome > 0.5 ? (1 - atHome) * 0.35 : 0.55 + nearness * 0.45
      uniforms.uFocus.value = focusAmt
      uniforms.uDim.value = atHome > 0.5 ? (1 - atHome) * 0.25 : 0.4 + focusAmt * 0.25
      return
    }

    if (s.scrollZone !== 'hero') return

    // Back on the hero: unwind the lobe highlight the trace left behind
    const k = Math.min(1, delta * 3)
    uniforms.uFocus.value += (0 - uniforms.uFocus.value) * k
    uniforms.uDim.value += (0 - uniforms.uDim.value) * k
    writeStageShape(0, 0, 0)

    /*
     * Damp the orbit out over the hero's exit. Every term in idleOrbit scales
     * with the amplitude, so at 0 the target is exactly the home framing and
     * the cluster stops turning — by the time the trace takes over there is
     * nothing left to reconcile, which is what removes the snap at its source
     * rather than smoothing over it.
     */
    const exit = Math.min(1, Math.max(0, s.heroExitProgress))
    idleOrbit(camera, lookRef, delta, 1 - exit)
  })

  return null
}
