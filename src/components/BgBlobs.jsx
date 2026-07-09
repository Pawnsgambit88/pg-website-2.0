/**
 * Decorative background blobs — absolutely positioned within the nearest
 * `position: relative` ancestor. Always pointer-events: none, z-index: 0.
 *
 * Usage: place as the first child of any `position: relative` container.
 */
export default function BgBlobs({ variant = 'light' }) {
  const blobs =
    variant === 'dark'
      ? [
          // Top-right — bright cyan
          { top: '-8%',   right: '-6%',  w: 520, h: 520, color: 'rgba(74,158,255,0.18)',  blur: 90  },
          // Bottom-left — deep blue
          { bottom: '-5%', left: '-8%',  w: 600, h: 600, color: 'rgba(21,101,192,0.14)', blur: 100 },
          // Centre-right — sky
          { top: '35%',   right: '18%',  w: 280, h: 280, color: 'rgba(168,212,255,0.10)', blur: 60  },
          // Top-left — subtle indigo
          { top: '5%',    left: '20%',   w: 200, h: 200, color: 'rgba(99,102,241,0.08)',  blur: 50  },
        ]
      : [
          // Top-right — main blue
          { top: '-6%',    right: '-4%',  w: 480, h: 480, color: 'rgba(74,158,255,0.13)',  blur: 80  },
          // Bottom-left — deeper blue
          { bottom: '-4%', left: '-8%',   w: 560, h: 560, color: 'rgba(21,101,192,0.09)',  blur: 100 },
          // Mid-right — soft sky
          { top: '42%',    right: '12%',  w: 260, h: 260, color: 'rgba(147,210,255,0.10)', blur: 55  },
          // Top-centre-left — very faint indigo
          { top: '8%',     left: '25%',   w: 180, h: 180, color: 'rgba(99,102,241,0.07)',  blur: 45  },
          // Bottom-right — tiny accent
          { bottom: '12%', right: '5%',   w: 160, h: 160, color: 'rgba(74,158,255,0.08)',  blur: 40  },
        ]

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top:    b.top,
            right:  b.right,
            bottom: b.bottom,
            left:   b.left,
            width:  b.w,
            height: b.h,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${b.color} 0%, transparent 68%)`,
            filter: `blur(${b.blur}px)`,
          }}
        />
      ))}
    </div>
  )
}
