import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, Mail } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const SKILL_LEVELS = [
  { value: 'beginner',     label: 'Beginner',             desc: 'I know the rules but not much strategy',            rating: 800 },
  { value: 'intermediate', label: 'Intermediate',          desc: 'I know tactics and some openings',                  rating: 1100 },
  { value: 'tournament',   label: 'Tournament Player',     desc: 'I play competitive chess regularly',                rating: 1400 },
  { value: 'expert',       label: 'Expert / Club Player',  desc: 'Strong understanding, 1800+ elsewhere',            rating: 1800 },
  { value: 'titled',       label: 'Titled Player',         desc: 'CM, FM, IM, GM, or national-level',                rating: 2200 },
]

function InputField({ label, value, onChange, type = 'text', placeholder, optional = false, hint }) {
  return (
    <div>
      <label className="block text-base font-medium text-slate-300 mb-1.5">
        {label} {optional && <span className="text-slate-500 font-normal">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={!optional}
        className="w-full bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors text-base"
      />
      {hint && <p className="text-slate-500 text-sm mt-1">{hint}</p>}
    </div>
  )
}

export default function Signup() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    chessComUsername: '', fideId: '', city: '', phone: '',
  })
  const [skillLevel, setSkillLevel] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function validateStep1() {
    if (!form.name.trim()) return 'Full name is required'
    if (!form.email.trim()) return 'Email is required'
    if (!form.password) return 'Password is required'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    return null
  }

  function validateStep2() {
    if (!form.phone.trim()) return 'Phone number is required'
    if (!agreedToTerms) return 'Please agree to the Terms & Conditions'
    return null
  }

  function handleNext1(e) {
    e.preventDefault()
    const err = validateStep1()
    if (err) { setError(err); return }
    setError('')
    setStep(2)
  }

  function handleNext2(e) {
    e.preventDefault()
    const err = validateStep2()
    if (err) { setError(err); return }
    setError('')
    setStep(3)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!skillLevel) { setError('Please select your skill level'); return }
    setError('')
    setLoading(true)
    try {
      await signUp({ ...form, skillLevel })
      setEmailSent(true)
    } catch (err) {
      setError(err.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-10">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-5">
              <Mail size={28} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-slate-400 text-sm mb-1">
              We sent a confirmation link to
            </p>
            <p className="text-white font-medium text-sm mb-5">{form.email}</p>
            <p className="text-slate-500 text-xs mb-7">
              Click the link in the email to activate your account. Check your spam folder if you don't see it.
            </p>
            <Link
              to="/login"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size={96} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white-400">Create your account</h1>
          <p className="text-white-400 mt-1">Join Hyderabad's largest chess club</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { n: 1, label: 'Account' },
            { n: 2, label: 'Profile' },
            { n: 3, label: 'Skill Level' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                n < step ? 'bg-blue-600 border-blue-600 text-white'
                  : n === step ? 'border-white text-white'
                  : 'border-slate-400 text-slate-400'
              }`}>
                {n < step ? <CheckCircle size={15} /> : n}
              </div>
              <span className={`text-xs ${n === step ? 'text-white' : 'text-slate-400'}`}>{label}</span>
              {n < 3 && <div className="w-8 h-px bg-slate-400 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-300 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext1} className="space-y-4">
              <InputField label="Full Name" value={form.name} onChange={set('name')} placeholder="Magnus Carlsen" />
              <InputField label="Email" value={form.email} onChange={set('email')} type="email" placeholder="chess@example.com" />
              <div>
                <label className="block text-base font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 pr-11 text-white placeholder-slate-500 outline-none transition-colors text-base"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required
                  placeholder="Repeat password"
                  className="w-full bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors text-base"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-base mt-2">
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNext2} className="space-y-4">
              <InputField label="City" value={form.city} onChange={set('city')} placeholder="Hyderabad" />
              <InputField label="Phone" value={form.phone} onChange={set('phone')} type="tel" placeholder="+91 xxxxx xxxxx" hint="For event notifications" />
              <InputField label="Chess.com Username" value={form.chessComUsername} onChange={set('chessComUsername')} placeholder="Your handle" optional />
              <InputField label="FIDE ID" value={form.fideId} onChange={set('fideId')} placeholder="25048123" optional />

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-1 accent-blue-500 w-4 h-4 flex-shrink-0"
                />
                <span className="text-slate-300 text-sm leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-blue-400 hover:underline">Terms &amp; Conditions</Link>
                  {' '}and{' '}
                  <Link to="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link>
                </span>
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(1); setError('') }}
                  className="flex-1 py-3 border border-navy-600 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors text-sm">
                  ← Back
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm">
                  Continue →
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-white font-semibold mb-1">What's your playing level?</h2>
                <p className="text-slate-400 text-sm mb-4">This sets your provisional Glicko-2 rating. Be honest — it adjusts quickly.</p>
                <div className="space-y-3">
                  {SKILL_LEVELS.map(level => (
                    <label
                      key={level.value}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        skillLevel === level.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-navy-600 hover:border-navy-500 bg-navy-900/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="skillLevel"
                        value={level.value}
                        checked={skillLevel === level.value}
                        onChange={() => setSkillLevel(level.value)}
                        className="mt-0.5 accent-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium text-sm">{level.label}</span>
                          <span className="text-blue-400 text-xs font-mono">~{level.rating}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">{level.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(2); setError('') }}
                  className="flex-1 py-3 border border-navy-600 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors text-sm">
                  ← Back
                </button>
                <button type="submit" disabled={loading || !skillLevel}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm">
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-slate-400 text-base mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
