import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, ArrowRight, Send } from 'lucide-react'
import { SOCIALS } from '../lib/socials'

const C = {
  ink:   '#ffffff',
  body:  'rgba(255,255,255,0.8)',
  faint: 'rgba(255,255,255,0.5)',
  blue:  '#FF6600',
  glow:  '#FF6600',
  line:  'rgba(255,255,255,0.2)',
  bg:    'rgba(255,255,255,0.1)',
  bgAlt: 'rgba(0,0,0,0.15)',
}

export default function Contact() {
  const [form, setForm]     = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState(null)

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    await new Promise(r => setTimeout(r, 800))
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'transparent' }}>
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${C.blue}12` }}
          >
            <Send size={24} style={{ color: C.blue }} />
          </div>
          <h2 className="font-bold text-2xl mb-3" style={{ color: C.ink }}>Message sent!</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: C.body }}>
            Thanks for reaching out. We'll get back to you as soon as possible.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: C.blue }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'transparent' }}>

      {/* LEFT: all content */}
      <div
        className="flex flex-col justify-center"
        style={{ width: '50%', padding: '6rem 4rem 4rem 6rem', background: 'rgba(0,0,0,0.15)', borderRight: `1px solid ${C.line}` }}
      >
        {/* Header */}
        <div className="mb-12">
          <p className="text-[20px] font-semibold tracking-[0.26em] uppercase mb-4" style={{ color: C.glow }}>
            Get in touch
          </p>
          <h1
            className="font-bold mb-4"
            style={{ fontSize: 'clamp(2.5rem, 4.5vw, 4rem)', color: C.ink, letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Contact Us
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: C.body, maxWidth: '38ch' }}>
            Have a question, want to collaborate, or just want to say hello?
            We'd love to hear from you.
          </p>
        </div>

        {/* Contact info */}
        <div className="space-y-8">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] uppercase mb-5" style={{ color: C.faint }}>
              Reach us directly
            </p>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.blue}12` }}>
                  <Mail size={16} style={{ color: C.blue }} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: C.faint }}>Email</p>
                  <a href="mailto:contact@pgchess.in" className="font-medium text-base transition-opacity hover:opacity-70" style={{ color: C.ink }}>
                    contact@pgchess.in
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.blue}12` }}>
                  <MapPin size={16} style={{ color: C.blue }} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: C.faint }}>Location</p>
                  <p className="font-medium text-base" style={{ color: C.ink }}>Hyderabad, India</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: C.line }} />

          <div>
            <p className="text-sm font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: C.faint }}>
              Follow along
            </p>
            <div className="flex gap-3 flex-wrap">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border transition-all hover:border-white/40 hover:text-white"
                  style={{ color: C.body, borderColor: C.line, background: C.bgAlt }}
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: form */}
      <div
        className="flex flex-col justify-center"
        style={{ width: '50%', padding: '6rem 6rem 4rem 4rem', background: 'transparent' }}
      >
        <p className="text-base font-semibold tracking-[0.26em] uppercase mb-6" style={{ color: C.ink }}>
          Send a message
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { key: 'name',  label: 'Name',  type: 'text',  placeholder: 'Your name' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: C.ink }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={e => set(key)(e.target.value)}
                placeholder={placeholder}
                required
                className="w-full rounded-xl px-4 py-3 text-base outline-none border transition-colors placeholder-white"
                style={{ background: C.bg, borderColor: C.line, color: C.ink }}
                onFocus={e => { e.target.style.borderColor = C.blue }}
                onBlur={e  => { e.target.style.borderColor = C.line }}
              />
            </div>
          ))}

          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: C.ink }}>
              Message
            </label>
            <textarea
              value={form.message}
              onChange={e => set('message')(e.target.value)}
              placeholder="What's on your mind?"
              required
              rows={6}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors resize-none placeholder-white"
              style={{ background: C.bg, borderColor: C.line, color: C.ink }}
              onFocus={e => { e.target.style.borderColor = C.blue }}
              onBlur={e  => { e.target.style.borderColor = C.line }}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full flex items-center justify-center gap-2.5 py-3 font-semibold text-white rounded-xl text-base transition-all hover:brightness-110 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
          >
            {status === 'loading' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Send message <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>

    </div>
  )
}
