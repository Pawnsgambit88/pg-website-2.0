import { Link } from 'react-router-dom'
import Logo from './Logo'
import { SOCIALS } from '../lib/socials'

const BORDER = 'rgba(74,158,255,0.1)'
const MUTED  = 'rgba(200,216,237,0.45)'

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ background: '#070f24', borderTop: `1px solid ${BORDER}`, scrollSnapAlign: 'start', scrollSnapStop: 'always', fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
              <span className="font-bold text-white text-sm tracking-wide">Pawn's Gambit</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              Hyderabad's chess community — where the board starts the conversation.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                   aria-label={label}
                   className="transition-colors hover:text-white"
                   style={{ color: MUTED }}>
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold text-xs tracking-widest uppercase mb-5" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Navigate</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Home',        path: '/' },
                { label: 'Tournaments', path: '/tournaments' },
                { label: 'Gallery',     path: '/gallery' },
                { label: 'Terms & Conditions', path: '/terms' },
                { label: 'Privacy Policy',     path: '/privacy' },
              ].map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm transition-colors hover:text-white"
                        style={{ color: MUTED }}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-xs tracking-widest uppercase mb-5" style={{ fontFamily: "'Times New Roman', Times, serif" }}>Contact</h3>
            <ul className="space-y-2.5 text-sm" style={{ color: MUTED }}>
              <li>
                <a href="mailto:contact@pgchess.in" className="transition-colors hover:text-white">
                  contact@pgchess.in
                </a>
              </li>
              <li>Hyderabad, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-xs" style={{ color: `${MUTED.slice(0, -4)}0.3)` }}>
            © 2026 Pawn's Gambit. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-xs transition-colors hover:text-white" style={{ color: `${MUTED.slice(0, -4)}0.3)` }}>
              Terms &amp; Conditions
            </Link>
            <Link to="/privacy" className="text-xs transition-colors hover:text-white" style={{ color: `${MUTED.slice(0, -4)}0.3)` }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
