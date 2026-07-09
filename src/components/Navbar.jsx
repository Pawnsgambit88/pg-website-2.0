import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [logoOpen, setLogoOpen]       = useState(false)
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const navLinks = [
    { label: 'Home',        path: '/' },
    { label: 'Tournaments', path: '/tournaments' },
    { label: 'Gallery',     path: '/gallery' },
    { label: 'Contact',     path: '/contact' },
  ]

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // On the white-background home page use dark ink; elsewhere use light text
  const isHome = location.pathname === '/'
  // Tournament detail pages have a light background — give the navbar a solid teal bg
  const isTournamentDetail = /^\/tournaments\/.+/.test(location.pathname)

  // Transparent → frosted-glass on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSignOut() {
    await signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#005a5a]/95 backdrop-blur-md border-b border-white/10 shadow-[0_1px_20px_rgba(0,0,0,0.3)]'
          : isTournamentDetail
            ? 'bg-[#005a5a] border-b border-white/10'
            : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => setLogoOpen(true)} className="flex items-center gap-2.5 flex-shrink-0 group">
            <Logo size={34} />
            <span className="font-bold text-sm tracking-wide hidden sm:block text-white transition-colors group-hover:opacity-80">
              Pawn's Gambit
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-white ${
                  isActive(link.path)
                    ? 'bg-white/20 border border-white/30'
                    : 'hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isHome ? 'text-white hover:bg-white/10' : 'text-white hover:bg-white/5'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
                  >
                    {initials}
                  </div>
                  <span className="font-medium">{profile?.name?.split(' ')[0] ?? 'Account'}</span>
                  <ChevronDown size={13} className={`text-white/60 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl py-1 z-50 border"
                    style={{
                      background: 'rgba(5,14,28,0.97)',
                      backdropFilter: 'blur(12px)',
                      borderColor: 'rgba(74,158,255,0.15)',
                    }}
                  >
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-pg-glow/10 transition-colors">
                      <User size={14} className="text-pg-glow/70" /> My Profile
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-pg-glow/10 transition-colors">
                        <Settings size={14} className="text-pg-glow/70" /> Admin Panel
                      </Link>
                    )}
                    <hr className="border-pg-glow/10 my-1" />
                    <button onClick={handleSignOut}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login"
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    'text-white hover:opacity-80'
                  }`}>
                  Log In
                </Link>
                <Link to="/signup"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-150 hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden transition-colors p-1 text-white hover:opacity-80"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-1"
          style={{
            background: 'rgba(3,9,18,0.98)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(74,158,255,0.12)',
          }}
        >
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.path)
                  ? 'text-white bg-pg-blue/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-pg-glow/10 my-2" />
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white">My Profile</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm text-slate-400 hover:text-white">Admin Panel</Link>}
              <button onClick={() => { handleSignOut(); setMenuOpen(false) }} className="block w-full text-left px-3 py-2.5 text-sm text-red-400">Sign Out</button>
            </>
          ) : (
            <div className="flex gap-2 pt-1">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-3 py-2.5 text-sm border border-pg-glow/15 text-slate-300 rounded-lg">Log In</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-3 py-2.5 text-sm text-white rounded-lg font-medium"
                style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}>Sign Up</Link>
            </div>
          )}
        </div>
      )}

      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </nav>

    {logoOpen && createPortal(
      <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" onClick={() => setLogoOpen(false)}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className="relative z-10 max-w-xl w-full rounded-3xl p-12 flex flex-col items-center text-center gap-8 shadow-2xl border border-sky-200"
          style={{ background: '#e0f2fe' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setLogoOpen(false)}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
          <Logo size={272} />
          <p className="text-slate-700 text-lg leading-relaxed">
            A pawn is never meant to stand alone. A single pawn has limited strength, but a community of pawns can defend, support, and advance together. Pawn's Gambit is built on that belief: every member helps another move forward.
          </p>
          {location.pathname !== '/' && (
            <button
              onClick={() => { setLogoOpen(false); navigate('/') }}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
            >
              Go to Homepage
            </button>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
