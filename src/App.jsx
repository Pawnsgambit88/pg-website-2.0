import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { ShaderRings } from './components/ShaderRings'

function IntroAnimation({ onDone }) {
  const canvasRef = useRef(null)
  const [showLogo, setShowLogo] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()
    window.addEventListener('resize', setSize)

    let startMs = null, raf

    function frame(now) {
      if (!startMs) startMs = now
      const elapsed = (now - startMs) / 1000

      const W = canvas.width
      const H = canvas.height
      const ctx = canvas.getContext('2d')
      const TILE = Math.round(Math.min(W, H) / 10)

      // Light teal base
      ctx.fillStyle = '#e0f5f5'
      ctx.fillRect(0, 0, W, H)

      // Two orbiting light sources that create dynamic reflections
      const light1 = {
        x: W / 2 + Math.sin(elapsed * 0.6) * W * 0.45,
        y: H / 2 + Math.cos(elapsed * 0.4) * H * 0.35,
      }
      const light2 = {
        x: W / 2 + Math.sin(elapsed * 0.35 + Math.PI) * W * 0.38,
        y: H / 2 + Math.cos(elapsed * 0.55 + Math.PI * 0.7) * H * 0.42,
      }
      const lightR = Math.max(W, H) * 0.6

      const cols = Math.ceil(W / TILE) + 2
      const rows = Math.ceil(H / TILE) + 2

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x = c * TILE
          const y = r * TILE
          const isDark = (r + c) % 2 === 0
          const cx = x + TILE / 2
          const cy = y + TILE / 2

          // Light contribution from each source (falloff)
          const d1 = Math.sqrt((cx - light1.x) ** 2 + (cy - light1.y) ** 2)
          const d2 = Math.sqrt((cx - light2.x) ** 2 + (cy - light2.y) ** 2)
          const l1 = Math.max(0, 1 - d1 / lightR) ** 1.8
          const l2 = Math.max(0, 1 - d2 / lightR) ** 1.8
          const light = Math.min(1, l1 * 0.75 + l2 * 0.55)

          // Dark squares: medium teal; light squares: bright white
          ctx.fillStyle = isDark
            ? `rgba(0,160,160,${0.55 + light * 0.20})`
            : `rgba(255,255,255,${0.75 + light * 0.22})`
          ctx.fillRect(x, y, TILE, TILE)

          // Glass diagonal highlight
          const hl = ctx.createLinearGradient(x, y, x + TILE * 0.7, y + TILE * 0.7)
          hl.addColorStop(0, `rgba(255,255,255,${0.30 + light * 0.20})`)
          hl.addColorStop(0.4, `rgba(220,248,248,${0.08 + light * 0.06})`)
          hl.addColorStop(1, 'rgba(180,230,230,0)')
          ctx.fillStyle = hl
          ctx.fillRect(x, y, TILE, TILE)

          // Depth shadow — soft
          const sh = ctx.createLinearGradient(x + TILE, y + TILE, x + TILE * 0.45, y + TILE * 0.45)
          sh.addColorStop(0, 'rgba(0,100,100,0.18)')
          sh.addColorStop(1, 'rgba(0,100,100,0)')
          ctx.fillStyle = sh
          ctx.fillRect(x, y, TILE, TILE)

          // Tile border
          ctx.strokeStyle = isDark
            ? `rgba(0,200,200,${0.15 + light * 0.35})`
            : `rgba(255,255,255,${0.40 + light * 0.40})`
          ctx.lineWidth = 0.5
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1)
        }
      }

      // Edge vignette — soft teal fade
      const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.65)
      vig.addColorStop(0, 'rgba(0,120,120,0)')
      vig.addColorStop(0.4, 'rgba(0,120,120,0.08)')
      vig.addColorStop(1, 'rgba(0,80,80,0.55)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    // Preload the logo so it's ready before the reveal timer fires
    const img = new Image()
    img.src = '/logo.svg'

    const t0 = setTimeout(() => setShowLogo(true), 300)
    const t1 = setTimeout(() => setFadeOut(true), 1800)
    const t2 = setTimeout(onDone, 2400)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', setSize)
    }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none',
      opacity: fadeOut ? 0 : 1, transition: 'opacity 0.6s ease',
    }}>
      <style>{`
        @keyframes pgGlow {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(0,200,200,0.4)) drop-shadow(0 0 38px rgba(255,255,255,0.15)); }
          50%       { filter: drop-shadow(0 0 30px rgba(0,220,220,0.65)) drop-shadow(0 0 60px rgba(255,255,255,0.28)); }
        }
      `}</style>
      {/* Chess board base */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {/* Subtle teal overlay to unify the board */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,160,160,0.06)', mixBlendMode: 'multiply' }} />
      {/* Shader rings — screen blend so they glow over the board */}
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}>
        <ShaderRings />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src="/logo.svg"
          alt="Pawn's Gambit"
          style={{
            width: 'min(66vw, 66vh)', height: 'auto', objectFit: 'contain',
            opacity: showLogo ? 1 : 0,
            transform: showLogo ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(12px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            animation: showLogo ? 'pgGlow 2.2s ease-in-out infinite' : 'none',
          }}
        />
      </div>
    </div>
  )
}

// Reset scroll to top on every navigation except Home (Home restores its own position)
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}
import { AuthProvider } from './context/AuthContext'
import { autoUpdateTournamentStatuses } from './lib/autoUpdateTournaments'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Tournaments from './pages/Tournaments'
import TournamentRegister from './pages/TournamentRegister'
import TournamentDetail from './pages/TournamentDetail'
import Gallery from './pages/Gallery'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import Contact from './pages/Contact'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <div className="text-8xl font-bold text-navy-700 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-slate-400 mb-6">The page you're looking for doesn't exist.</p>
        <a href="/" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
          Go Home
        </a>
      </div>
    </div>
  )
}

export default function App() {
  useEffect(() => { autoUpdateTournamentStatuses() }, [])

  const [showIntro, setShowIntro] = useState(
    () => !sessionStorage.getItem('pg-intro-seen')
  )
  const handleIntroDone = useCallback(() => {
    sessionStorage.setItem('pg-intro-seen', '1')
    setShowIntro(false)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        {showIntro && <IntroAnimation onDone={handleIntroDone} />}
        <div className="flex flex-col min-h-screen" style={{ position: 'relative', background: '#005a5a' }}>
          {/* Global PCA chess background — behind all content */}
          <img src="/PCA.png" alt="" style={{
            position: 'fixed', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            opacity: 0.1, pointerEvents: 'none', zIndex: -1,
          }} />
          <ScrollToTop />
          <Navbar />
          {/* No z-index here: keeps page content in the ROOT stacking context so
              the hero photo (z-index 11) can paint OVER the fixed pawn canvas
              (z-index 10), while the pawn still floats above section backgrounds. */}
          <div className="flex-1" style={{ position: 'relative' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/tournaments/:id/register" element={<TournamentRegister />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
