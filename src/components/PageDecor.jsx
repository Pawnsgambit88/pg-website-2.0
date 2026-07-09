/**
 * PageDecor — uses lucide-react icons:
 *   • Leaf clusters hanging from the top-left and top-right corners (vines)
 *   • Two-layer row of TreePine icons along the bottom (bushes)
 *
 * Drop as first child of any `position: relative` container.
 * Everything is pointer-events: none, z-index: 0.
 */
import { Leaf, TreePine } from 'lucide-react'

// ── Vine leaves ──────────────────────────────────────────────────────────────
// [topPct, xPx, size, rotate, opacity]
//  topPct  = top as % of container height
//  xPx     = left (for left vine) / right (for right vine) in px
//  rotate  = degrees (mirrored for right side)
const VINE_LEAVES = [
  [0,   2,  36, -42, 0.13],
  [3,   28, 24,  58, 0.10],
  [7,   8,  30, -28, 0.11],
  [12,  34, 20,  72, 0.09],
  [17,  14, 28, -54, 0.10],
  [22,  40, 18,  35, 0.08],
  [27,  5,  22, -48, 0.08],
  [2,   54, 16,  82, 0.07],
  [10,  58, 14, -38, 0.07],
  [20,  62, 18,  52, 0.06],
  [32,  18, 20, -30, 0.07],
  [37,  44, 14,  65, 0.06],
]

// ── Bottom bushes ─────────────────────────────────────────────────────────────
// [leftPct, size, opacity, bottomOffsetPx, color]
const BACK_TREES = [
  [1,  32, 0.07, 4,  '#0f1115'], [8,  24, 0.06, 6,  '#0f1115'],
  [15, 38, 0.08, 3,  '#0f1115'], [22, 28, 0.06, 5,  '#0f1115'],
  [29, 36, 0.08, 4,  '#0f1115'], [36, 44, 0.09, 2,  '#0f1115'],
  [43, 26, 0.06, 6,  '#0f1115'], [50, 40, 0.08, 3,  '#0f1115'],
  [57, 30, 0.07, 5,  '#0f1115'], [64, 42, 0.09, 2,  '#0f1115'],
  [71, 24, 0.06, 6,  '#0f1115'], [78, 36, 0.08, 4,  '#0f1115'],
  [85, 44, 0.09, 2,  '#0f1115'], [92, 28, 0.07, 5,  '#0f1115'],
  [99, 34, 0.08, 3,  '#0f1115'],
]

const FRONT_TREES = [
  [4,  38, 0.11, 0, '#1565c0'], [11, 28, 0.09, 0, '#1565c0'],
  [18, 44, 0.12, 0, '#1565c0'], [25, 22, 0.07, 0, '#1565c0'],
  [32, 40, 0.10, 0, '#1565c0'], [39, 50, 0.13, 0, '#1565c0'],
  [46, 30, 0.09, 0, '#1565c0'], [53, 46, 0.12, 0, '#1565c0'],
  [60, 34, 0.10, 0, '#1565c0'], [67, 48, 0.13, 0, '#1565c0'],
  [74, 26, 0.08, 0, '#1565c0'], [81, 40, 0.11, 0, '#1565c0'],
  [88, 46, 0.12, 0, '#1565c0'], [95, 30, 0.09, 0, '#1565c0'],
]

export default function PageDecor() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Left vine ── */}
      {VINE_LEAVES.map(([t, x, sz, rot, op], i) => (
        <Leaf
          key={`vl${i}`}
          size={sz}
          style={{
            position: 'absolute',
            top: `${t}%`,
            left: x,
            transform: `rotate(${rot}deg)`,
            opacity: op,
            color: '#1565c0',
          }}
        />
      ))}

      {/* ── Right vine (mirrored) ── */}
      {VINE_LEAVES.map(([t, x, sz, rot, op], i) => (
        <Leaf
          key={`vr${i}`}
          size={sz}
          style={{
            position: 'absolute',
            top: `${t}%`,
            right: x,
            transform: `rotate(${-rot}deg)`,
            opacity: op,
            color: '#1565c0',
          }}
        />
      ))}

      {/* ── Back bush layer ── */}
      {BACK_TREES.map(([lPct, sz, op, bOff, col], i) => (
        <TreePine
          key={`tb${i}`}
          size={sz}
          style={{
            position: 'absolute',
            bottom: bOff,
            left: `${lPct}%`,
            transform: 'translateX(-50%)',
            opacity: op,
            color: col,
          }}
        />
      ))}

      {/* ── Front bush layer ── */}
      {FRONT_TREES.map(([lPct, sz, op, bOff, col], i) => (
        <TreePine
          key={`tf${i}`}
          size={sz}
          style={{
            position: 'absolute',
            bottom: bOff,
            left: `${lPct}%`,
            transform: 'translateX(-50%)',
            opacity: op,
            color: col,
          }}
        />
      ))}
    </div>
  )
}
