import { useEffect, useLayoutEffect, useState, useRef, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import carouselPic1 from '../assets/carousel-home-s3/pic1.jpeg'
import carouselPic2 from '../assets/carousel-home-s3/pic2.jpeg'
import carouselPic3 from '../assets/carousel-home-s3/pic3.jpeg'

const ChessPawn3D = lazy(() => import('../components/ChessPawn3D'))

// ─── Site-wide palette ─────────────────────────────────────────────────────────
const C = {
  ink:    '#ffffff',
  body:   '#ffffff',
  faint:  '#e0e0e0',
  blue:   '#069494',
  glow:   '#069494',
  line:   'rgba(255,255,255,0.2)',
  bg:     '#005a5a',
  bgAlt:  '#004a4a',
}

// ─── Fade / rise on scroll ─────────────────────────────────────────────────────
function FadeIn({ children, className = '', delay = 0, y = 26 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.10 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
      transition: `opacity 1s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 1s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ─── Section eyebrow (light sections) ─────────────────────────────────────────
function Eyebrow({ children, n }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] uppercase mb-7" style={{ color: C.faint }}>
      {n && <span style={{ color: C.blue }}>{n}</span>}
      <span className="h-px w-8" style={{ background: C.line }} />
      {children}
    </p>
  )
}

// ─── Photo placeholder ─────────────────────────────────────────────────────────
function Photo({ label, className = '', aspect = 'aspect-[4/3]', rounded = 'rounded-2xl' }) {
  return (
    <div className={`relative overflow-hidden ${rounded} ${aspect} ${className}`}
         style={{ background: C.bgAlt, border: `1px solid ${C.line}` }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-4" style={{ color: C.faint }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-2.5 opacity-40">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <p className="text-[11px] tracking-wide opacity-60">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Photo carousel ───────────────────────────────────────────────────────────
const CAROUSEL_SLIDES = [carouselPic1, carouselPic2, carouselPic3]

function Carousel({ startIdx = 0 }) {
  const [idx, setIdx] = useState(startIdx)

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % CAROUSEL_SLIDES.length), 3200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '1rem', overflow: 'hidden' }}>
      {CAROUSEL_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, objectFit: 'cover' }}
        />
      ))}


      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 1 }}>
        {CAROUSEL_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === idx ? '1.1rem' : '0.375rem', background: i === idx ? C.blue : C.line }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Expandable "Learn more" block (controlled — parent owns open state) ──────
function LearnMore({ children, align = 'left', isOpen = false, onToggle }) {
  return (
    <div className={`mt-6 ${align === 'right' ? 'text-right' : ''}`}>
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.20em] uppercase transition-opacity hover:opacity-60"
        style={{ color: '#ffffff' }}
      >
        <span>{isOpen ? 'Close' : 'Learn more'}</span>
        <ArrowRight
          size={14}
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}
        />
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: isOpen ? '600px' : '0px',
        transition: 'max-height 480ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div className="pg-desc pt-5 space-y-3 text-xl leading-[1.85]" style={{ color: C.body }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Member stories data ──────────────────────────────────────────────────────
const MEMBER_STORIES = [
  {
    story: "I joined Pawn's Gambit because I missed playing chess. What I didn't expect was how quickly familiar faces would turn into friends. Somewhere between post-game discussions, cups of chai, and conversations that had nothing to do with chess, weekends stopped feeling routine. Today, I don't show up just to play — I show up because it's where some of my favourite people are.",
    name: 'Suraj',
    initials: 'S',
  },
  {
    story: "Moving to a new city can feel surprisingly lonely as an adult. I came to Pawn's Gambit looking for a hobby and found something much more valuable — a community. The chess brought us to the same table, but it was the shared stories, laughter, and friendships that kept me coming back. It's one of the few places where I arrived as a stranger and genuinely felt welcomed.",
    name: 'Sravani',
    initials: 'Sr',
  },
]

// ─── Story pop-up modal ───────────────────────────────────────────────────────
function StoryModal({ story, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bg,
          border: `1px solid ${C.line}`,
          borderRadius: '1.5rem',
          padding: '2.5rem',
          maxWidth: '540px', width: '100%',
          position: 'relative',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: '1.2rem', lineHeight: 1 }}
        >✕</button>

        <div style={{ fontSize: '3.5rem', lineHeight: 1, color: `${C.blue}50`, fontFamily: 'Georgia, serif', userSelect: 'none', marginBottom: '0.75rem' }}>"</div>

        <p className="pg-desc" style={{ color: C.body, lineHeight: 1.85, fontSize: '1.05rem', marginBottom: '1.75rem' }}>
          {story.story}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', paddingTop: '1.25rem', borderTop: `1px solid ${C.line}` }}>
          <div style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.blue}, ${C.glow})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: 'white',
          }}>{story.initials}</div>
          <div>
            <p style={{ fontWeight: 600, color: C.ink, fontSize: '0.95rem' }}>{story.name}</p>
            <p style={{ fontSize: '0.75rem', color: C.faint }}>Pawn's Gambit Member</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Story preview carousel (2-line preview, click → full modal) ─────────────
function StoryCards({ onOpen }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % MEMBER_STORIES.length), 5200)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {/* Cards */}
      <div style={{ position: 'relative' }}>
        {MEMBER_STORIES.map((m, i) => (
          <div
            key={m.name}
            style={{
              opacity: i === idx ? 1 : 0,
              pointerEvents: i === idx ? 'auto' : 'none',
              transition: 'opacity 600ms ease',
              position: i === 0 ? 'relative' : 'absolute',
              top: 0, left: 0, right: 0,
            }}
          >
            <button
              onClick={() => onOpen(m)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'rgba(255,255,255,0.07)',
                border: `1px solid ${C.line}`,
                borderRadius: '1.25rem',
                padding: '1.25rem 1.5rem',
                cursor: 'pointer',
                transition: 'background 200ms, border-color 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = C.line }}
            >
              {/* Opening quote */}
              <div style={{ fontSize: '2rem', lineHeight: 1, color: `${C.blue}60`, fontFamily: 'Georgia, serif', marginBottom: '0.4rem', userSelect: 'none' }}>"</div>

              {/* 2-line preview */}
              <p className="pg-desc" style={{
                color: C.body, fontSize: '0.9rem', lineHeight: 1.7,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                marginBottom: '1rem',
              }}>
                {m.story}
              </p>

              {/* Footer: name + read more hint */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.875rem', borderTop: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #FF4500, #FF9900)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: 'white',
                  }}>{m.initials}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: C.ink }}>{m.name}</p>
                    <p style={{ fontSize: '0.7rem', color: C.faint }}>Pawn's Gambit Member</p>
                  </div>
                </div>
                <span style={{ fontSize: '1rem', color: C.faint, fontWeight: 600 }}>Read more →</span>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '0.375rem', paddingLeft: '0.25rem' }}>
        {MEMBER_STORIES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            style={{
              height: '0.375rem',
              width: i === idx ? '1.1rem' : '0.375rem',
              borderRadius: '9999px',
              background: i === idx ? C.blue : C.line,
              transition: 'all 300ms',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── PCA background image ─────────────────────────────────────────────────────
function PcaBg({ dark = false, zIndex = -1, opacity = 0.1 }) {
  return (
    <img
      src="/PCA.png"
      alt=""
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        filter: 'none',
        opacity,
        pointerEvents: 'none',
        zIndex,
      }}
    />
  )
}

// ─── Team ─────────────────────────────────────────────────────────────────────
const SHOW_SPONSORS = false

const TEAM = [
  { name: 'Sairam Kolaganti', piece: 'King',   symbol: '♔', role: 'Founder',     quote: '"The game was always about the people around the board."',    description: "The visionary behind Pawn's Gambit, building a community where chess is the beginning of something much bigger.", initials: 'SK', photo: '/sairam.jpeg'  },
  { name: 'Parth Thakkar',   piece: 'Rook',   symbol: '♖', role: 'Co-Founder',  quote: '"Steady, reliable — the kind of presence every team needs."', description: 'The operational backbone ensuring every event and every experience runs exactly as it should.',               initials: 'PT', photo: null            },
  { name: 'Anirudh',         piece: 'Knight', symbol: '♘', role: 'Team Member', quote: '"Sometimes the best move is the one no one expects."',         description: 'Creative and unpredictable in the best way — always finding the angle others miss.',                         initials: 'A',  photo: '/anirudh.jpeg' },
  { name: 'Sai Teja',        piece: 'Bishop', symbol: '♗', role: 'Team Member', quote: '"Long-range thinking, one diagonal at a time."',               description: "Strategic and forward-looking, focused on where the community is headed rather than where it's been.",       initials: 'ST', photo: null            },
]

function TeamSection() {
  const [idx, setIdx]           = useState(0)
  const [visible, setVisible]   = useState(true)
  const [rotation, setRotation] = useState(0)   // cumulative degrees — never resets
  const [wheelR, setWheelR]     = useState(320)
  const idxRef            = useRef(0)
  const pieceContainerRef = useRef(null)

  useEffect(() => {
    const advance = () => {
      const next = (idxRef.current + 1) % TEAM.length
      setVisible(false)
      setRotation(r => r - 90)          // always counter-clockwise, never wraps
      setTimeout(() => {
        idxRef.current = next
        setIdx(next)
        setVisible(true)
      }, 420)
    }
    const id = setInterval(advance, 6750)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = pieceContainerRef.current
    if (!el) return
    const update = () => setWheelR(el.offsetWidth / 2 + 60)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const goTo = (i) => {
    if (i === idxRef.current) return
    const steps = (i - idxRef.current + TEAM.length) % TEAM.length
    setVisible(false)
    setRotation(r => r - steps * 90)   // always spin counter-clockwise to reach target
    setTimeout(() => {
      idxRef.current = i
      setIdx(i)
      setVisible(true)
    }, 420)
  }

  const m = TEAM[idx]

  return (
    <>
      <section
        className="relative"
        style={{
          background: C.bgAlt,
          height: 'calc(100vh - 64px)',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '7fr 3fr',
          borderTop: `1px solid ${C.line}`,
          isolation: 'isolate',
        }}
      >
        <PcaBg />

        {/* Top-left: team photo + content */}
        <div
          style={{
            gridColumn: 1, gridRow: 1,
            background: C.bg,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '1.25rem',
            padding: '3rem 3.5rem',
            overflow: 'hidden',
          }}
        >
          {/* Left + Right columns */}
          <div style={{ display: 'flex', gap: '1.5rem', flex: 1, alignItems: 'center' }}>

            {/* LEFT: header + name/role/quote/description — vertically centered */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
              <div className="flex items-center gap-3" style={{ paddingBottom: '0.75rem' }}>
                <span className="font-bold tabular-nums" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>06</span>
                <span style={{ flex: '0 0 24px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span className="font-bold pg-heading" style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Team</span>
              </div>

              <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 280ms ease' }}>
                <div className="flex items-center gap-2.5 mb-2" style={{ flexWrap: 'wrap' }}>
                  <p className="font-bold" style={{ fontSize: '1.05rem', color: C.ink, letterSpacing: '-0.01em' }}>{m.name}</p>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.blue, background: `${C.blue}14`, padding: '0.2rem 0.6rem', borderRadius: '999px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{m.role}</span>
                </div>
                <p className="pg-desc" style={{ fontSize: '1rem', color: '#ffffff', fontStyle: 'italic', marginBottom: '0.5rem', lineHeight: 1.55 }}>{m.quote}</p>
                <p style={{ fontSize: '0.95rem', color: C.body, lineHeight: 1.75 }}>{m.description}</p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => goTo((idxRef.current - 1 + TEAM.length) % TEAM.length)}
                  className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:bg-white/10"
                  style={{ borderColor: `${C.line}`, color: C.body }}
                >
                  <ArrowRight size={15} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  onClick={() => goTo((idxRef.current + 1) % TEAM.length)}
                  className="flex items-center justify-center w-9 h-9 rounded-full border transition-colors hover:bg-white/10"
                  style={{ borderColor: `${C.line}`, color: C.body }}
                >
                  <ArrowRight size={15} />
                </button>
                <div className="flex gap-1.5 ml-1">
                  {TEAM.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? C.ink : C.line, transition: 'background 300ms' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: photo */}
            <div style={{
              width: '45%', height: '80%', borderRadius: '1rem', overflow: 'hidden', flexShrink: 0,
              background: C.bgAlt, border: `1px solid ${C.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: visible ? 1 : 0, transition: 'opacity 420ms ease',
            }}>
              {m.photo ? (
                <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              ) : (
                <div style={{ textAlign: 'center', color: C.faint }}>
                  <div style={{
                    width: '4rem', height: '4rem', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.blue}, ${C.glow})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', fontWeight: 700, color: 'white', margin: '0 auto 0.5rem',
                  }}>{m.initials}</div>
                  <p style={{ fontSize: '0.65rem', opacity: 0.5 }}>Photo coming soon</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom-left: chess piece wheel */}
        <div
          ref={pieceContainerRef}
          style={{
            gridColumn: 1,
            gridRow: 2,
            background: `linear-gradient(145deg, ${C.blue} 0%, ${C.glow} 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: `calc(50% + ${wheelR}px)`,
              width: 0, height: 0,
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {TEAM.map((member, i) => {
              const a  = i * Math.PI / 2
              const px = Math.round(Math.sin(a) * wheelR)
              const py = Math.round(-Math.cos(a) * wheelR)
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${px}px`,
                    top: `${py}px`,
                    transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
                    transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 'clamp(6rem, 10vw, 9rem)', color: 'rgba(255,255,255,0.92)', lineHeight: 1, userSelect: 'none' }}>
                    {member.symbol}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column (full height): Partners */}
        <div
          style={{
            gridColumn: 2, gridRow: '1 / 3',
            background: C.bgAlt,
            padding: '3rem 3.5rem',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '2rem',
            overflow: 'hidden',
          }}
        >
          <p style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ffffff', flexShrink: 0 }}>
            Partners
          </p>

          {[
            { role: 'Coaching Partner', name: 'Panda School of Chess', logo: '/panda-chess.png', dark: true  },
            { role: 'Venue Partner',    name: 'RMZ Real Estate Developers and Investment Experts',                 logo: '/rmz.png',         dark: false },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffffff' }}>{p.role}</p>
              <div style={{
                borderRadius: '1rem',
                background: p.dark ? '#111' : '#ffffff',
                border: `1px solid ${C.line}`,
                padding: '1.25rem 1.5rem',
                display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <img
                  src={p.logo}
                  alt={p.name}
                  style={{ width: '3.5rem', height: '3.5rem', objectFit: 'contain', borderRadius: '0.5rem', flexShrink: 0 }}
                />
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: p.dark ? '#fff' : '#000000', lineHeight: 1.3 }}>{p.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dividers — vertical centre, horizontal splits left column only */}
        <div className="absolute inset-y-0 left-1/2 pointer-events-none" style={{ width: 1, background: C.line }} />
        <div className="absolute left-0 pointer-events-none" style={{ top: '70%', width: '50%', height: 1, background: C.line }} />
      </section>
    </>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "What is Pawn's Gambit?", a: "Pawn's Gambit (PG) is Hyderabad's largest social chess club, bringing together chess enthusiasts through tournaments, meetups, community events, and unique player progression systems. We believe chess is more than a game—it's a way to connect, compete, learn, and build lasting friendships." },
  { q: "What makes Pawn's Gambit different from other chess clubs?", a: "Unlike traditional chess clubs that focus only on tournaments, Pawn's Gambit combines competitive chess with social experiences. From Chess & Chill meetups and café events to city-wide tournaments and community challenges, PG creates an environment where players can improve their chess while becoming part of a vibrant community." },
  { q: "Who can join Pawn's Gambit?", a: "Everyone is welcome. Whether you're a complete beginner, a casual player, a college student, a working professional, or a seasoned tournament competitor, you'll find events and opportunities tailored to your level." },
  { q: "What kind of events does Pawn's Gambit organize?", a: "Pawn's Gambit hosts a variety of chess experiences throughout Hyderabad, including Rapid and Blitz tournaments, Chess & Chill social meetups, themed events and special formats, college and corporate events, and workshops and learning sessions. Our goal is to make chess engaging both on and off the board." },
  { q: "What is the Pawn's Gambit Rating (PGR)?", a: "The Pawn's Gambit Rating (PGR) is our official community rating system that tracks player performance across PG events. It helps create local leaderboards, friendly rivalries, seasonal rankings, and a sense of progression within the community." },
  { q: "How does the PG Rating system work?", a: "Players gain or lose rating points based on their performance in Pawn's Gambit events. Strong results against highly-rated opponents lead to greater rating gains. The system rewards competitive performance while encouraging regular participation in community events." },
  { q: "Why does Pawn's Gambit have a rating system if it's a social chess club?", a: "Because friendly competition makes communities stronger. Our ratings aren't meant to replace FIDE, Chess.com, or Lichess ratings. Instead, they help tell your story within the Pawn's Gambit ecosystem—showing how you've grown, competed, and contributed as a member of Hyderabad's largest social chess club." },
  { q: "What are PG Badges and Achievements?", a: "Badges and Achievements are milestones that celebrate a player's journey within Pawn's Gambit. While ratings measure competitive strength, badges recognize participation, consistency, improvement, community involvement, and memorable accomplishments." },
  { q: "How can I earn badges?", a: "Members can unlock badges by participating in events, winning games and tournaments, reaching rating milestones, maintaining attendance streaks, volunteering at events, contributing to the community, and completing special challenges. Each badge represents a unique chapter in your PG journey." },
  { q: "Do badges and achievements unlock rewards?", a: "Yes. Certain badges and achievements may unlock exclusive benefits such as merchandise, discounts, priority registrations, special event access, community recognition, and seasonal rewards. The more active you are, the more opportunities you unlock." },
  { q: "Why should I join Pawn's Gambit?", a: "Because Pawn's Gambit is more than a chess club—it's a community. As Hyderabad's largest social chess club, we provide a place where players can compete, improve, make friends, earn recognition, and be part of a growing chess movement. Whether you're chasing ratings, collecting badges, or simply looking for great people to play chess with, there's a place for you at PG." },
]

function FaqSection() {
  const [open, setOpen] = useState(null)

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: C.bg,
        height: 'calc(100vh - 64px)',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        borderTop: `1px solid ${C.line}`,
      }}
    >
      <PcaBg />

      {/* Left: heading */}
      <div className="relative z-10 flex flex-col justify-center px-12 py-16" style={{ borderRight: `1px solid ${C.line}` }}>
        <FadeIn>
          <Eyebrow n="06">FAQ</Eyebrow>
          <h2
            className="font-bold leading-tight mb-6"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', color: C.ink, letterSpacing: '-0.02em' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-base leading-relaxed" style={{ color: C.body, maxWidth: '30ch' }}>
            Everything you need to know about Pawn's Gambit, our rating system, badges, and community.
          </p>
        </FadeIn>
      </div>

      {/* Right: accordion (scrollable) */}
      <div className="relative z-10 overflow-y-auto py-10 px-10" style={{ scrollbarWidth: 'none' }}>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left transition-opacity hover:opacity-80"
            >
              <span className="font-semibold text-sm leading-snug" style={{ color: C.ink }}>
                <span style={{ color: C.blue, marginRight: '0.75rem', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 text-base transition-transform duration-300"
                style={{ color: C.faint, transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', display: 'inline-block' }}
              >
                +
              </span>
            </button>
            <div
              style={{
                overflow: 'hidden',
                maxHeight: open === i ? '300px' : '0px',
                transition: 'max-height 350ms cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <p className="pb-5 text-sm leading-relaxed" style={{ color: C.body }}>
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [upcoming, setUpcoming] = useState([])
  const [openStory, setOpenStory] = useState(null)
  // Only one "Learn more" can be open at a time across the whole page
  const [openLearn, setOpenLearn] = useState(null)
  const tog = (key) => setOpenLearn(prev => prev === key ? null : key)

  useEffect(() => {
    const html = document.documentElement
    html.style.scrollSnapType = 'y mandatory'
    html.style.scrollPaddingTop = '64px'
    return () => {
      html.style.scrollSnapType = ''
      html.style.scrollPaddingTop = ''
    }
  }, [])

  // Home always opens at the top. ScrollToTop in App.jsx deliberately skips
  // Home, so without this the scroll position carries over from whatever page
  // you navigated from — Home would mount scrolled down and the pawn would
  // render a mid-scroll position. useLayoutEffect runs before paint = no flash.
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])


  useEffect(() => {
    supabase.from('tournaments')
      .select('*, tournament_registrations(count)')
      .in('status', ['upcoming', 'registration_open'])
      .order('date', { ascending: true }).limit(3)
      .then(({ data }) => setUpcoming((data || []).map(t => ({ ...t, registered_count: t.tournament_registrations?.[0]?.count ?? 0 }))))
  }, [])

  return (
    <>
      {openStory && <StoryModal story={openStory} onClose={() => setOpenStory(null)} />}

      <Suspense fallback={null}>
        <ChessPawn3D />
      </Suspense>

      <main id="pg-home-content" style={{ background: C.bg, color: C.ink }}>

        {/* ════════════════════════════════════════════════════════════════════
            1 · HERO  —  white, full-viewport, pawn floats right
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative flex items-center overflow-hidden"
          style={{
            background: C.bg,
            height: '100vh',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            paddingLeft: 'clamp(2.5rem, 10vw, 10rem)',
            paddingRight: 'clamp(1.5rem, 3vw, 3rem)',
            gap: 'clamp(2rem, 4vw, 4rem)',
          }}
        >
          <PcaBg zIndex={0} />

          {/* ── Left: text ─────────────────────────────────────────────── */}
          <div className="relative z-10 flex-shrink-0 max-w-lg">
            <FadeIn>
              <p className="text-[13px] font-semibold tracking-[0.28em] uppercase mb-6"
                 style={{ color: '#ffffff' }}>
                Hyderabad's Chess Community
              </p>
            </FadeIn>

            <FadeIn delay={80}>
              <h1
                className="font-bold"
                style={{ fontSize: 'clamp(3rem, 5vw, 5.5rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}
              >
                <span style={{ color: '#FF8502' }}>
                  Chess is never
                </span ><br />
                <span style={{ color: '#FF8502' }}>the point.</span><br />
                <span style={{ whiteSpace: 'nowrap' }}>People are.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={160}>
              <p className="pg-desc mt-9 text-2xl leading-relaxed" style={{ color: C.body }}>
                A community for thoughtful people who want meaningful connections,
                healthy competition, and great conversations — through chess.
              </p>
            </FadeIn>

            <FadeIn delay={240}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 font-semibold text-white rounded-full text-sm transition-all duration-200 hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
                >
                  Join Pawn's Gambit
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/tournaments"
                  className="inline-flex items-center gap-2 py-3.5 text-sm font-semibold transition-opacity hover:opacity-60"
                  style={{ color: C.faint }}
                >
                  See upcoming events <ArrowUpRight size={15} />
                </Link>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: photo carousel (hidden on mobile) ────────────────── */}
          <div
            className="relative flex-1 min-w-0 hidden md:block"
            style={{ height: '68vh', borderRadius: '1.5rem', overflow: 'hidden', zIndex: 11 }}
          >
            <Carousel />
          </div>
        </section>
        
        {/* ════════════════════════════════════════════════════════════════════
            3 · PAWN'S GAMBIT  +  EXPERIENCES
            Q1 top-left : pawn space        |  Q2 top-right : What is PG
            Q3 bot-left : carousel + CTA    |  Q4 bot-right : Experiences
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative"
          style={{
            background: C.bgAlt,
            height: 'calc(100vh - 64px)',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            borderTop: `1px solid ${C.line}`,
            isolation: 'isolate',
          }}
        >
          <PcaBg />
          {/* Left column — spans full height; pawn floats top, carousel crosses midline, CTA below */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ gridColumn: 1, gridRow: '1 / 3', padding: '0 3.5rem' }}
          >
            <div style={{ flex: '0 0 28%' }} />
            <div style={{ flex: '0 0 42%' }}>
              <Carousel />
            </div>
            <div className="flex flex-col items-center text-center" style={{ flex: 1, justifyContent: 'center', paddingBottom: '1.5rem' }}>
              <p className="text-[10px] font-semibold tracking-[0.24em] uppercase mb-2" style={{ color: C.faint }}>Ready?</p>
              <h3 className="font-bold mb-4" style={{ fontSize: 'clamp(1.2rem, 1.8vw, 1.6rem)', color: C.ink, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                Your next move starts here.
              </h3>
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2.5 px-6 py-3 font-semibold text-white rounded-full text-sm transition-all duration-200 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
              >
                Join Pawn's Gambit
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right column: 03 + 04 merged — right-aligned, no horizontal partition */}
          <div
            className="flex flex-col justify-center overflow-y-auto text-right"
            style={{ gridColumn: 2, gridRow: '1 / 3', padding: '2.5rem 3.5rem' }}
          >
            {/* 03 · What Is Pawn's Gambit */}
            <div style={{
              opacity: openLearn === 'exp' ? 0 : 1,
              maxHeight: openLearn === 'exp' ? '0px' : '600px',
              overflow: 'hidden',
              pointerEvents: openLearn === 'exp' ? 'none' : 'auto',
              transition: 'opacity 400ms ease, max-height 500ms cubic-bezier(0.22,1,0.36,1)',
            }}>
            <FadeIn>
              <div className="flex items-center justify-end gap-3 mb-4">
                <span className="font-bold pg-heading" style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>What Is Pawn's Gambit</span>
                <span style={{ flex: '0 0 24px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span className="font-bold tabular-nums" style={{ fontSize: 'clamp(3rem, 4.5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>01</span>
              </div>
              <p className="pg-desc mb-1 leading-relaxed" style={{ color: C.body, fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>
                We're building more than just a community.
              </p>
              <LearnMore align="right" isOpen={openLearn === 'pg'} onToggle={() => tog('pg')}>
                <p>A gathering space for students, professionals, former competitors, and curious minds — connected through chess, staying for the people.</p>
                <p>We host events that give strangers a reason to sit together, think together, and return.</p>
              </LearnMore>
            </FadeIn>
            </div>

            {/* Divider between 03 and 04 */}
            <div style={{
              overflow: 'hidden',
              maxHeight: (openLearn === 'pg' || openLearn === 'exp') ? '0px' : '80px',
              opacity: (openLearn === 'pg' || openLearn === 'exp') ? 0 : 1,
              transition: 'opacity 400ms ease, max-height 500ms cubic-bezier(0.22,1,0.36,1)',
            }}>
              <div style={{ height: 1, background: C.line, margin: '2.5rem 0' }} />
            </div>

            {/* 04 · Experiences */}
            <div style={{
              opacity: openLearn === 'pg' ? 0 : 1,
              maxHeight: openLearn === 'pg' ? '0px' : '600px',
              overflow: 'hidden',
              pointerEvents: openLearn === 'pg' ? 'none' : 'auto',
              transition: 'opacity 400ms ease, max-height 500ms cubic-bezier(0.22,1,0.36,1)',
            }}>
            <FadeIn delay={140}>
              <div className="flex items-center justify-end gap-3 mb-4">
                <span className="font-bold pg-heading" style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Experiences</span>
                <span style={{ flex: '0 0 24px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span className="font-bold tabular-nums" style={{ fontSize: 'clamp(3rem, 4.5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>02</span>
              </div>
              <p className="pg-desc mb-1 leading-relaxed" style={{ color: C.body, fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>
                Something for everyone.
              </p>
              <LearnMore align="right" isOpen={openLearn === 'exp'} onToggle={() => tog('exp')}>
                <div className="mt-2">
                  {[
                    { tag: 'Casual',      title: 'Chess & Chai',       body: 'Relaxed play — no pressure, no rating required. Brew in hand, board on the table.' },
                    { tag: 'Competitive', title: 'Weekend Tournaments', body: 'Rated Swiss-format events. Compete at your level, earn your rating, improve.' },
                    { tag: 'Learning',    title: 'Weekly Workshops',    body: 'Structured sessions on openings, endgames, and tactics. Think deeper, get better.' },
                  ].map(ev => (
                    <div key={ev.title} className="py-3 flex flex-row-reverse gap-4 items-start" style={{ borderTop: `1px solid ${C.line}` }}>
                      <span
                        className="mt-0.5 text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                        style={{ color: '#FF6600', background: 'rgba(255,102,0,0.12)' }}
                      >{ev.tag}</span>
                      <div className="text-right">
                        <p className="font-semibold text-lg leading-snug" style={{ color: C.ink }}>{ev.title}</p>
                        <p className="text-lg leading-relaxed mt-0.5" style={{ color: C.body }}>{ev.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </LearnMore>
            </FadeIn>
            </div>
          </div>

          {/* Only the vertical divider between left and right columns */}
          <div className="absolute inset-y-0 left-1/2 pointer-events-none" style={{ width: 1, background: C.line }} />
        </section>


        {/* ════════════════════════════════════════════════════════════════════
            2 · THE PROBLEM  +  WHY CHESS
            3-column grid: problem top-left (Q2) | pawn centre | chess bottom-right (Q4)
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{
            background: C.bg,
            height: 'calc(100vh - 64px)',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            borderTop: `1px solid ${C.line}`,
            isolation: 'isolate',
          }}
        >
          <PcaBg />
          {/* ── Q2 · The Problem (top-left, left-aligned) ───────────────── */}
          <div
            className="flex items-center"
            style={{ gridColumn: 1, gridRow: '1 / 3', padding: '0 3.5rem' }}
          >
            <FadeIn className="max-w-[380px]">
              {/* Big display header: 01 ——— The Problem */}
              <div className="flex items-center gap-4 mb-6">
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}
                >
                  03
                </span>
                <span style={{ flex: '0 0 32px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span
                  className="font-bold pg-heading"
                  style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05, whiteSpace: 'nowrap' }}
                >
                  The Problem
                </span>
              </div>

              <p className="pg-desc leading-relaxed mb-2" style={{ color: C.body, fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>
                We are more connected than ever, and somehow more alone.
              </p>

              <LearnMore isOpen={openLearn === 'problem'} onToggle={() => tog('problem')}>
                <p>Most adults don't struggle to find things to do.<br />
                   They struggle to find people to do them with.</p>
                <p>Humans have replaced gathering with scrolling.<br />
                   Friendship with notifications.<br />
                   Conversation with comments.</p>
                <p style={{ color: C.ink, fontWeight: 600 }}>
                  Pawn's Gambit exists because we believe people deserve better.
                </p>
              </LearnMore>
            </FadeIn>
          </div>

          {/* ── Centre column: pawn floats here (canvas overlay handles it) ── */}
          <div style={{ gridColumn: 2, gridRow: '1 / 3' }} />

          {/* ── Q4 · Why Chess (bottom-right, right-aligned) ────────────── */}
          <div
            className="flex items-center justify-end"
            style={{ gridColumn: 3, gridRow: '1 / 3', padding: '0 3.5rem' }}
          >
            <FadeIn delay={140} className="max-w-[380px] text-right">
              {/* Big display header: 02 ——— Why Chess */}
              <div className="flex items-center justify-end gap-4 mb-6">
                <span
                  className="font-bold pg-heading"
                  style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 , whiteSpace: 'nowrap'}}
                >
                  Why Chess
                </span>
                <span style={{ flex: '0 0 32px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}
                >
                  04
                </span>
              </div>

              <p className="pg-desc leading-relaxed mb-2" style={{ color: C.body, fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>
                Chess creates something rare.
              </p>

              <LearnMore align="right" isOpen={openLearn === 'chess'} onToggle={() => tog('chess')}>
                <p>A reason for strangers to sit together.</p>
                <p>A reason to think together.</p>
                <p>A reason to return.</p>
                <p>The board starts the conversation.<br />The community keeps it going.</p>
              </LearnMore>
            </FadeIn>
          </div>

          {/* Hair-line dividers */}
          <div className="absolute inset-x-0 top-1/2 pointer-events-none"
               style={{ height: 1, background: C.line }} />
          <div className="absolute inset-y-0 left-1/3 pointer-events-none"
               style={{ width: 1, background: C.line }} />
          <div className="absolute inset-y-0 right-1/3 pointer-events-none"
               style={{ width: 1, background: C.line }} />
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            4 · COMMUNITY  —  white, 4-quadrant snap
            TL: Community text  |  TR: Carousel A
            BL: Carousel B      |  BR: Member Stories carousel
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative"
          style={{
            background: C.bg,
            height: 'calc(100vh - 64px)',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            borderTop: `1px solid ${C.line}`,
            isolation: 'isolate',
          }}
        >
          <PcaBg />
          {/* TL · Community */}
          <div
            className="flex flex-col justify-center overflow-hidden"
            style={{ gridColumn: 1, gridRow: 1, padding: '2.5rem 3.5rem' }}
          >
            <FadeIn>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-bold tabular-nums" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', color: '#ffffff', letterSpacing: '-0.04em', lineHeight: 1 }}>05</span>
                <span style={{ flex: '0 0 24px', height: 2, background: C.blue, opacity: 0.35, borderRadius: 2 }} />
                <span className="font-bold pg-heading" style={{ fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)', color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Community</span>
              </div>
              <p className="pg-desc mb-1 leading-relaxed" style={{ color: C.body, fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>
                Where Chess Becomes Community.
              </p>
              <LearnMore isOpen={openLearn === 'community'} onToggle={() => tog('community')}>
                <p>We believe the best chess experiences aren't measured only by ratings or results. They're measured by the people you meet, the conversations you have, and the feeling of belonging that keeps you coming back.</p>
              </LearnMore>
            </FadeIn>
          </div>

          {/* TR · Carousel A */}
          <div
            className="overflow-hidden"
            style={{ gridColumn: 2, gridRow: 1, padding: '1rem' }}
          >
            <Carousel />
          </div>

          {/* BL · Carousel B */}
          <div
            className="overflow-hidden"
            style={{ gridColumn: 1, gridRow: 2, padding: '1rem' }}
          >
            <Carousel startIdx={1} />
          </div>

          {/* BR · Member Stories */}
          <div
            className="overflow-hidden"
            style={{ gridColumn: 2, gridRow: 2, padding: '2rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}
          >
            <p
              className="text-[11px] font-semibold tracking-[0.22em] uppercase flex items-center gap-3"
              style={{ color: C.faint, marginBottom: '1.25rem', flexShrink: 0 }}
            >
              <span className="h-px w-8 inline-block" style={{ background: C.line }} />
              From the community
            </p>
            <StoryCards onOpen={setOpenStory} />
          </div>

          {/* Hair-line dividers */}
          <div className="absolute inset-x-0 pointer-events-none" style={{ top: 'calc(50% + 2rem)', height: 1, background: C.line }} />
          <div className="absolute inset-y-0 left-1/2 pointer-events-none" style={{ width: 1, background: C.line }} />
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            5 · TEAM  (Partners toggleable via SHOW_SPONSORS constant above)
        ════════════════════════════════════════════════════════════════════ */}
        <TeamSection />

        {/* ════════════════════════════════════════════════════════════════════
            6 · FAQ
        ════════════════════════════════════════════════════════════════════ */}
        <FaqSection />

        {/* ════════════════════════════════════════════════════════════════════
            9 · CTA
        ════════════════════════════════════════════════════════════════════ */}
        <section
          className="relative px-6"
          style={{
            background: '#000000',
            height: 'calc(100vh - 64px)',
            scrollSnapAlign: 'start',
            scrollSnapStop: 'always',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            isolation: 'isolate',
          }}
        >
          <PcaBg dark opacity={0.3} />
          {/* Black tint overlay to subdue the background drawing */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 0 }} />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <FadeIn>
              <h2 className="font-bold tracking-tight leading-[1.08] mb-8"
                  style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Where thoughtful people gather around a chessboard — and leave with something more.
              </h2>
              <p className="font-semibold pg-desc leading-relaxed mb-12 max-w-2xl mx-auto" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)', color: 'rgba(255,255,255,0.9)' }}>
                We believe chess deserves better than being confined to screens and score sheets.
                It deserves laughter after a blunder, debates that continue long after the pieces are
                packed away, and rooms filled with people who genuinely enjoy thinking together.
                That's the experience we're building, one event at a time.
              </p>
              <Link to="/signup"
                className="group inline-flex items-center gap-2.5 px-9 py-4 font-semibold rounded-full text-base transition-all duration-200 hover:brightness-95"
                style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)', color: '#ffffff' }}>
                Join Pawn's Gambit
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </FadeIn>
          </div>
        </section>

      </main>
    </>
  )
}
