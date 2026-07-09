import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import * as THREE from 'three'

// True only on a real page load/reload. The module initialises once per page
// load; the first PawnRig mount consumes the flag and flips it false, so any
// later SPA navigation back to Home sees `false`. This lets us nudge the pawn
// left on reload only — never when arriving from another page.
let isFreshLoad = true

// ─── Pose equations ───────────────────────────────────────────────────────────
// The pawn's pose is a pure function of the scroll position `sp` (how many
// viewport-heights the page has scrolled). Each keyframe pins an (x, tiltZ, y)
// for a given sp; between keyframes we smoothstep-interpolate. So at every
// scroll position the pawn has a well-defined x position and angle — no
// thresholds, no jumps, fully continuous and predictable.
//
//   sp = 0  → hero       : right half, vertical middle, upright
//   sp = 1  → section 2  : centre, tilted back
//   sp = 2  → section 3  : centre, tilted forward
//   sp = 3  → past        : flies up and off-screen, never seen again
const smoothstep = (t) => t * t * (3 - 2 * t)

function pose(sp, viewport) {
  const RIGHT = viewport.width * 0.25  // hero: pawn centre at 75% across the screen
  const T2 = -(Math.PI / 10)                        // section-2 tilt (back)
  const T3 =  (Math.PI / 10)                        // section-3 tilt (forward)
  const EXIT = viewport.height * 2                  // upward exit speed

  const keys = [
    { sp: 0, x: RIGHT, tilt: 0,  y: 0 },    // hero: right half, middle, upright
    { sp: 1, x: 0,     tilt: T2, y: 0 },    // centre, tilted back
    { sp: 2, x: 0,     tilt: T3, y: 0 },    // centre, tilted forward
    { sp: 3, x: 0,     tilt: T3, y: EXIT }, // gone, never seen again
  ]

  // Clamp below the first / above the last keyframe
  if (sp <= keys[0].sp)  return { x: keys[0].x,  tiltZ: keys[0].tilt,  y: keys[0].y }
  const last = keys[keys.length - 1]
  if (sp >= last.sp) {
    // Keep rising past the final keyframe so it stays gone when scrolling far
    const extra = (sp - last.sp) * EXIT
    return { x: last.x, tiltZ: last.tilt, y: last.y + extra }
  }

  // Find the bracketing keyframes and smoothstep between them
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1]
    if (sp >= a.sp && sp <= b.sp) {
      const t = smoothstep((sp - a.sp) / (b.sp - a.sp))
      return {
        x:     a.x    + (b.x    - a.x)    * t,
        tiltZ: a.tilt + (b.tilt - a.tilt) * t,
        y:     a.y    + (b.y    - a.y)    * t,
      }
    }
  }
  return { x: keys[0].x, tiltZ: keys[0].tilt, y: keys[0].y }
}

// ─── Mesh ─────────────────────────────────────────────────────────────────────
function PawnMesh() {
  const groupRef = useRef()
  const innerRef = useRef()
  const ready    = useRef(false)

  const raw = useLoader(OBJLoader, '/chess-pawn/pawn.obj')
  const obj = useMemo(() => raw.clone(true), [raw])

  useEffect(() => {
    if (!obj) return
    const mat = new THREE.MeshPhysicalMaterial({
      color:              new THREE.Color('#f4ebeb'),
      roughness:          1.00,
      metalness:          1.00,
      clearcoat:          0.4,
      clearcoatRoughness: 0.15,
      reflectivity:       0.3,
      envMapIntensity:    1.0,
    })
    obj.traverse(c => { if (c.isMesh) c.material = mat })
  }, [obj])

  // Auto-fit + centre, exactly ONCE. Critical: reset groupRef's transform to
  // identity before measuring, because innerRef's WORLD box includes groupRef's
  // scale — measuring while scaled creates a feedback loop (scale↑ → box↑ →
  // scale↓ → box↓ …) which is what made the pawn jitter between two positions.
  // We force-update matrices so the single measurement is correct even on a
  // cached-OBJ SPA navigation, then lock it.
  useFrame(() => {
    if (ready.current || !innerRef.current || !groupRef.current) return
    const group = groupRef.current
    const inner = innerRef.current

    group.scale.setScalar(1)
    group.position.set(0, 0, 0)
    group.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(inner)
    if (box.isEmpty()) return
    const size = box.getSize(new THREE.Vector3())
    if (size.y < 0.001) return

    const center = box.getCenter(new THREE.Vector3())
    const s = 2.2 / size.y
    group.scale.setScalar(s)
    group.position.set(-center.x * s, -center.y * s, -center.z * s)
    ready.current = true
  })

  return (
    <group ref={groupRef}>
      <group ref={innerRef} rotation={[-Math.PI / 2, 0, 0.09]}>
        <primitive object={obj} />
      </group>
    </group>
  )
}

// ─── Rig: pose driven entirely by the scroll-position equations ──────────────
function PawnRig() {
  const { camera } = useThree()
  const posRef    = useRef()
  const tiltRef   = useRef()
  const clock     = useRef(0)
  const markerRef = useRef(null)
  const cur       = useRef({ posX: 0, posY: 0, tiltZ: 0 })
  const prevSp    = useRef(null)
  const revealAt  = useRef(null)
  // Capture whether THIS mount is a fresh page load, then consume the flag so
  // subsequent SPA navigations back to Home don't get the shift.
  const freshLoad = useRef(null)
  if (freshLoad.current === null) { freshLoad.current = isFreshLoad; isFreshLoad = false }

  useFrame((_, delta) => {
    if (!posRef.current || !tiltRef.current) return
    clock.current += delta

    if (!markerRef.current || !markerRef.current.isConnected) {
      markerRef.current =
        document.getElementById('pg-home-content') ||
        document.querySelector('main')
    }
    const marker = markerRef.current
    if (!marker) { posRef.current.visible = false; return }

    // Hidden for the first 300ms — pin to dead centre so the pawn always first
    // appears at the centre of the screen, then hands off to the equations.
    if (revealAt.current === null) revealAt.current = performance.now() + 300
    const hidden = performance.now() < revealAt.current
    posRef.current.visible = !hidden

    // Scroll position in viewport-heights, straight from the DOM (works with
    // any scroll mechanism, no listeners / seeds / races).
    const sp = -marker.getBoundingClientRect().top / (window.innerHeight || 1)

    // Snap on first frame, while hidden, or on a teleport (> 0.5vh in a frame)
    const snap = hidden || prevSp.current === null || Math.abs(sp - prevSp.current) > 0.5
    prevSp.current = sp

    // Compute the visible world size at the pawn plane (z=0) FRESH every frame
    // using the SAME aspect the renderer projects with (camera.aspect, read
    // live). This keeps our placement and the actual projection in agreement,
    // so x = vw*0.25 always lands at exactly 75% across the canvas — no
    // dependence on R3F's stale `viewport` snapshot.
    const dist = camera.position.z
    const vh   = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist
    const vw   = vh * camera.aspect
    const viewport = { width: vw, height: vh }

    const target = pose(sp, viewport)

    // On a fresh load/reload only, nudge the pawn 25% of the screen to the left
    // (25% of screen = 0.25 * vw in world units). Not applied on SPA nav.
    if (freshLoad.current) target.x -= 0.25 * vw

    if (snap) {
      cur.current.posX  = target.x
      cur.current.posY  = target.y
      cur.current.tiltZ = target.tiltZ
    } else {
      const k = 1 - Math.exp(-4.0 * delta)
      cur.current.posX  += (target.x     - cur.current.posX)  * k
      cur.current.posY  += (target.y     - cur.current.posY)  * k
      cur.current.tiltZ += (target.tiltZ - cur.current.tiltZ) * k
    }

    // Gentle float, full amplitude when upright, fades out as it tilts
    const floatScale = Math.max(0, 1 - Math.abs(cur.current.tiltZ) / (Math.PI / 6))
    const floatY     = Math.sin(clock.current * 0.8) * 0.10 * floatScale

    posRef.current.position.x  = cur.current.posX
    posRef.current.position.y  = cur.current.posY + floatY
    tiltRef.current.rotation.y = 0.45
    tiltRef.current.rotation.z = cur.current.tiltZ
  })

  return (
    <group ref={posRef}>
      <group ref={tiltRef}>
        <Suspense fallback={null}>
          <PawnMesh />
        </Suspense>
      </group>
    </group>
  )
}

// ─── Keep the canvas locked to the real window size ──────────────────────────
// Our container is a position:fixed inset:0 overlay, so its true size is always
// the window. On SPA navigation R3F's ResizeObserver can latch onto a stale
// size → wrong camera aspect → correct world coords project to the wrong pixels
// (the "only right after reload" bug). Re-assert the real size whenever it
// drifts, so world (0,0,0) always projects to screen centre.
function ForceCanvasSize() {
  const setSize = useThree((s) => s.setSize)
  const size    = useThree((s) => s.size)
  const camera  = useThree((s) => s.camera)
  // Runs every frame BEFORE PawnRig (registered first). Besides keeping the
  // renderer sized to the window, it forces camera.aspect synchronously so
  // PawnRig reads the correct value this frame — R3F's own aspect update lands
  // a few frames late (async React commit), which on first load left the hero
  // pawn placed too far right until it caught up.
  useFrame(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    if (Math.abs(size.width - w) > 1 || Math.abs(size.height - h) > 1) {
      setSize(w, h)
    }
    const aspect = w / Math.max(1, h)
    if (camera.isPerspectiveCamera && Math.abs(camera.aspect - aspect) > 1e-4) {
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
  })
  return null
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ForceCanvasSize />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect"   intensity={4}   position={[ 3,  4,  5]} scale={[10, 10, 1]} color="#ffffff" />
        <Lightformer form="rect"   intensity={2.5} position={[-5,  1,  3]} scale={[ 4, 10, 1]} color="#4a9eff" />
        <Lightformer form="rect"   intensity={2}   position={[ 4, -1, -4]} scale={[ 8,  5, 1]} color="#1565c0" />
        <Lightformer form="circle" intensity={2.2} position={[ 0,  5,  2]} scale={[ 5,  5, 1]} color="#a8d4ff" />
      </Environment>

      <ambientLight intensity={0.18} />
      <directionalLight position={[-5, 8, 6]} intensity={2.4} color="#fff8f0" />
      <pointLight position={[2, -3, 5]} intensity={1.4} color="#4a9eff" decay={2} />

      <PawnRig />
    </>
  )
}

// ─── Full-screen fixed canvas (desktop only) ──────────────────────────────────
export default function ChessPawn3D() {
  const wrapperRef = useRef(null)
  const [show, setShow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  )
  useEffect(() => {
    const onResize = () => setShow(window.innerWidth >= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  if (!show) return null

  return (
    <div ref={wrapperRef} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <Canvas
        eventSource={wrapperRef}
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 8], fov: 36 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
