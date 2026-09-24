# 08. A particle cloud that feels the visitor

For a WebGL point cloud (three.js / react-three-fiber) with per-particle attributes
`aSeed` (0..1 random), a rest position, and a shared vertex-shader function that
computes each particle's displayed position (call it `displace(pos, seed, morph)`).
If connection lines exist, their vertex shader must call the same function so line
ends stay on the particles.

Everything here is stateless in the shader: the CPU only writes a few uniforms (an
origin and a start time per effect), and each particle computes its offset from
`uTime`. No GPGPU, no per-particle state, cheap on phones.

## What worked and what did not

| Tried | Result | Keep? |
|---|---|---|
| Pushing particles away from the hovering cursor | Read as the cloud flinching, and looked cheap | No |
| Water-style rings on click | Looked like water, not like a living swarm | No |
| Light shockwaves sent from the pointer as it moves | The cloud seems to sense the visitor | Yes |
| Swarm startle on click: flee, curl, own noise current, regroup | Organic, alive | Yes |
| Raids: a few particles break off and bite the cursor | Playful, memorable | Yes |
| Attackers dragging their connection lines | Streaks across the whole screen | No: keep the web put |

Light is the main channel. Movement on hover is irritating; movement on intent
(a click) is welcome.

## Finding where the pointer is on the cloud

Raycast against an invisible proxy sphere around the cloud each frame, and convert the
hit into the cloud group's local space (the cloud rotates, so world space drifts):

```ts
raycaster.setFromCamera(ndc.set(mouse.x, mouse.y), camera)
const hits = raycaster.intersectObject(proxy, false)
if (hits.length) {
  localHit.copy(hits[0].point)
  group.worldToLocal(localHit)
}
```

The proxy's surface sits in front of much of the cloud, so do not measure effects as
a 3D distance from the hit. Measure **across the line of sight**: pass the camera's
forward direction in cluster space as `uViewDir` and project it out.

```ts
camera.getWorldDirection(view)
view.applyQuaternion(group.getWorldQuaternion(q).invert())
uniforms.uViewDir.value.copy(view.normalize())
```

```glsl
vec3 d = pos - origin;
vec3 across = d - dot(d, uViewDir) * uViewDir;   // what you see on screen
float dist = length(across);
```

Also keep a small list of the page's HUD elements (buttons, sliders, copy blocks)
and ignore the pointer while it is over one, using one `elementFromPoint` per frame
at most. Keep that list current: stale class names are why clicks on a CTA were
rippling the particles behind it.

## Events between the scene and the UI

The scene and the DOM talk through window events, defined once in a tiny module that
imports nothing, so UI code never imports scene code:

```ts
export const SWARM_ENTER = 'swarm:enter'     // pointer came onto the cloud
export const SWARM_LEAVE = 'swarm:leave'     // pointer left it (also fire on unmount)
export const SWARM_PULSE = 'swarm:pulse'     // a light pulse was sent
export const SWARM_TOUCH = 'swarm:touch'     // a click landed on the cloud
export const SWARM_ATTACK = 'swarm:attack'   // a raid reached the cursor
export const SWARM_BITE = 'swarm:bite'       // one bite
export const SWARM_RETREAT = 'swarm:retreat' // the raid falls back
```

## 1. Light pulses from the pointer

When the pointer arrives on the cloud, send one shockwave of light from where it
touched. While it keeps moving, send another every 0.8 to 1.7 seconds (random each
time, so it feels like a response, not a metronome), but only after it has travelled
~0.5 units since the last one. Four slots, round robin: `uPulse[4]` with
`xyz = origin, w = uTime at start` (`-1` = free).

```glsl
float waveFront(vec3 pos, vec3 origin, float ph, float sharp) {
  float d = distance(pos, origin);
  float w = exp(-sharp * abs(d - ph * 7.0)) * (1.0 - ph) * (1.0 - ph);
  w *= 0.7 + 0.5 * sin(dot(pos, vec3(2.3, 1.9, 2.7)) + uTime * 1.6);  // ragged, organic front
  return max(w, 0.0);
}
vec3 touchLight(vec3 pos) {
  vec3 c = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 w = uPulse[i];
    if (w.w < 0.0) continue;
    float ph = (uTime - w.w) / 2.6;
    if (ph < 0.0 || ph > 1.0) continue;
    c += mix(uAccent, vec3(1.0), 0.5) * waveFront(pos, w.xyz, ph, 3.0) * 1.9;
  }
  return c;
}
// in the particle shader: vColor += touchLight(currentPos) * morph;
```

Measure from the particle's **current** position (after any shape morph), not its
rest position, so it keeps working when the cloud morphs into other shapes.

## 2. The swarm startled by a click

A click on the cloud (use `click`, not `pointerdown`: on phones every scroll starts
with a pointerdown) writes `uRipple[slot] = (origin, uTime)`. Each particle:

- waits for the signal to reach it: `dist / 3.2` seconds plus its own hesitation
  (`fract(seed * 13.7) * 0.28`), so it spreads like a message through a hive,
- flees, curls round the touch (clockwise or anticlockwise per particle), and rides
  its own noise current,
- follows a startle envelope that peaks near 0.45s and settles by ~3s.

```glsl
float gSwarm = 0.0;
vec3 swarmOffset(vec3 pos, float seed) {
  vec3 off = vec3(0.0); float agit = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 r = uRipple[i];
    if (r.w < 0.0) continue;
    float t = uTime - r.w;
    if (t < 0.0 || t > 3.6) continue;
    vec3 d = pos - r.xyz;
    vec3 across = d - dot(d, uViewDir) * uViewDir;
    float dist = length(across);
    float reach = exp(-dist * dist * 0.3);          // near ones scatter, far ones shiver
    if (reach < 0.002) continue;
    float lt = t - dist / 3.2 - fract(seed * 13.7) * 0.28;
    if (lt <= 0.0) continue;
    float env = lt * exp(1.0 - lt * 2.2) * 2.2;     // rise fast, peak ~0.45s, settle
    vec3 away = dist > 1e-4 ? across / dist : vec3(0.0, 1.0, 0.0);
    vec3 swirl = cross(away, uViewDir) * (fract(seed * 5.13) < 0.5 ? -1.0 : 1.0);
    float nt = uTime * 0.9;
    vec3 flow = vec3(snoise(pos * 0.85 + vec3(seed * 3.1, nt, 0.0)),
                     snoise(pos * 0.85 + vec3(0.0, seed * 2.7, nt + 17.0)),
                     snoise(pos * 0.85 + vec3(nt + 41.0, 0.0, seed * 1.9)));
    float give = 0.7 + 0.6 * fract(seed * 7.31);
    off += (away * 0.5 + swirl * 0.3 + flow * 0.38) * env * reach * give;
    agit += env * reach;
  }
  gSwarm = min(agit, 1.4);
  return off;
}
// displace(): p += swarmOffset(pos, seed) * morph;
// particle colour: vColor += mix(uAccent, vec3(1.0), 0.45) * gSwarm * 0.75;
```

With reduced motion, skip the movement and keep the light.

## 3. Raids on the cursor

Only for a fine pointer (there must be a cursor to attack) and never with reduced
motion. Timing: the first raid after 3.5 to 6 seconds of time spent on the cloud, then
every 7 to 12 seconds. A click provokes one right after the startle.

Uniforms: `uAttack = (origin where the pointer was, start time)` and
`uAttackTarget`, which is the cursor now, chased each frame. The target must exist
even when the cursor leaves the cloud, so compute it on the pointer's ray at the
cloud's depth, then ease toward it:

```ts
raycaster.setFromCamera(ndc.set(mouse.x, mouse.y), camera)
group.getWorldPosition(center)
raycaster.ray.at(camera.position.distanceTo(center), chase)
group.worldToLocal(chase)
uniforms.uAttackTarget.value.lerp(chase, Math.min(1, dt * 5))   // lag = the chase
```

```glsl
float gAttack = 0.0;
vec3 attackPos(vec3 p, float seed) {
  gAttack = 0.0;
  if (uAttack.w < 0.0) return p;
  float t = uTime - uAttack.w;
  if (t < 0.0 || t > 4.0) return p;
  vec3 fromTouch = p - uAttack.xyz;
  float near = exp(-dot(fromTouch, fromTouch) * 0.25);
  if (fract(seed * 91.7) > 0.035 + 0.09 * near) return p;     // ~130 attackers, mostly nearby
  float lt = (t - fract(seed * 37.3) * 0.5) / 3.4;             // own departure, 3.4s raid
  if (lt <= 0.0 || lt >= 1.0) return p;
  float k = lt < 0.28 ? pow(lt / 0.28, 2.2) : (lt < 0.62 ? 1.0 : 1.0 - smoothstep(0.62, 1.0, lt));
  float s = seed * 6.2831853;
  vec3 bite = vec3(sin(uTime * 7.0 + s) * 0.22, cos(uTime * 6.3 + s * 1.7) * 0.2, sin(uTime * 5.1 + s * 2.3) * 0.18);
  bite *= 0.6 + 0.4 * snoise(vec3(seed * 9.0, uTime * 2.0, 0.0));
  vec3 target = uAttackTarget + bite;
  vec3 dir = target - p; float len = length(dir);
  vec3 side = len > 1e-4 ? cross(dir / len, uViewDir) : vec3(0.0);
  vec3 bend = side * sin(k * 3.14159265) * len * 0.28 * (fract(seed * 5.7) < 0.5 ? -1.0 : 1.0);
  gAttack = k;
  return mix(p, target, k) + bend;
}
// displace(), last step, only for settled particles:
//   gAttack = 0.0;
//   #ifndef NO_ATTACK
//     if (k > 0.9) p = attackPos(p, seed);
//   #endif
// the connection shader starts with `#define NO_ATTACK`, so the web stays put
// attackers: vColor = mix(vColor, vec3(1.0, .26, .42), gAttack * .75); vGlow *= 1.0 + gAttack * 1.6;
```

CPU beats, seconds from the raid's start, mirroring the shader: arrive at 0.9 (fire
`swarm:attack`), bite every 0.18 to 0.38s (`swarm:bite`), retreat at 2.35
(`swarm:retreat`), end at 4.0 (set `uAttack.w = -1`, schedule the next). If the scene
unmounts mid-raid, fire `swarm:retreat` from the cleanup.

## Per-frame time

Use a delta capped only against a tab-switch jump (`Math.min(delta, 0.25)`), not at
0.05. A tight cap makes every timed thing run slow on a device that renders few
frames, so releases and decays stop matching real time.
