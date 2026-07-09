import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, MapPin, Trophy, AlertCircle, CheckCircle, IndianRupee, Users, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { initiatePayment } from '../lib/razorpay'
import { CITIES, AREAS_BY_CITY } from '../lib/locationData'

const PROFILE_FIELDS = ['gender', 'birthday', 'city', 'area', 'pincode', 'chess_com_username', 'fide_id']

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

function Select({ label, value, onChange, options, placeholder, optional }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label} {optional && <span className="text-slate-500 font-normal">(optional)</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 pr-10 text-white outline-none transition-colors text-sm"
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, optional, type = 'text', maxLength }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label} {optional && <span className="text-slate-500 font-normal">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors text-sm"
      />
    </div>
  )
}

function ProfileStep({ profile, onDone, fetchProfile, userId }) {
  const missing = PROFILE_FIELDS.filter(f => !profile?.[f])
  const needs = field => missing.includes(field)

  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [city, setCity] = useState(profile?.city || '')
  const [area, setArea] = useState('')
  const [pincode, setPincode] = useState('')
  const [chessComUsername, setChessComUsername] = useState('')
  const [fideId, setFideId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const areas = AREAS_BY_CITY[city] || []

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updates = {}
      if (needs('gender') && gender) updates.gender = gender
      if (needs('birthday') && birthday) updates.birthday = birthday
      if (needs('city') && city) updates.city = city
      if (needs('area') && area) updates.area = area
      if (needs('pincode') && pincode) updates.pincode = pincode
      if (needs('chess_com_username') && chessComUsername) updates.chess_com_username = chessComUsername
      if (needs('fide_id') && fideId) updates.fide_id = fideId

      if (Object.keys(updates).length > 0) {
        const { error: err } = await supabase.from('users').update(updates).eq('id', userId)
        if (err) throw err
        await fetchProfile(userId)
      }
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const hasRequired = needs('gender') || needs('birthday') || needs('city') || needs('area') || needs('pincode')
  const hasOptional = needs('chess_com_username') || needs('fide_id')

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Complete your profile</h1>
          <p className="text-white/50 text-sm">We need a few more details before you can register</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {hasRequired && (
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-medium text-sm uppercase tracking-wider opacity-60 -mb-1">Your Details</h3>

              {needs('gender') && (
                <Select label="Gender" value={gender} onChange={setGender} options={GENDERS} placeholder="Select gender" />
              )}
              {needs('birthday') && (
                <TextInput label="Date of Birth" value={birthday} onChange={setBirthday} type="date" placeholder="" />
              )}
              {needs('city') && (
                <Select label="City" value={city} onChange={v => { setCity(v); setArea('') }} options={CITIES} placeholder="Select city" />
              )}
              {needs('area') && (
                areas.length > 0 ? (
                  <Select label="Area / Locality" value={area} onChange={setArea} options={areas} placeholder="Select area" />
                ) : (
                  <TextInput label="Area / Locality" value={area} onChange={setArea} placeholder="Your area or locality" />
                )
              )}
              {needs('pincode') && (
                <TextInput label="Pincode" value={pincode} onChange={v => setPincode(v.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pincode" maxLength={6} />
              )}
            </div>
          )}

          {hasOptional && (
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-medium text-sm uppercase tracking-wider opacity-60 -mb-1">Chess Profile</h3>
              {needs('chess_com_username') && (
                <TextInput label="Chess.com Username" value={chessComUsername} onChange={setChessComUsername} placeholder="Your Chess.com handle" optional />
              )}
              {needs('fide_id') && (
                <TextInput label="FIDE ID" value={fideId} onChange={setFideId} placeholder="e.g. 25048123" optional />
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onDone}
              className="flex-1 py-3 border border-white/20 text-white/60 hover:text-white hover:border-white/40 font-medium rounded-xl text-sm transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TournamentRegister() {
  const { id } = useParams()
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()
  const [showProfileStep, setShowProfileStep] = useState(false)
  const profileStepDismissed = useRef(false)

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/tournaments/${id}/register` } } })
      return
    }
    fetchTournament()
  }, [id, user])

  useEffect(() => {
    if (profile && !profileStepDismissed.current) {
      const anyMissing = PROFILE_FIELDS.some(f => !profile[f])
      setShowProfileStep(anyMissing)
    }
  }, [profile])

  async function fetchTournament() {
    try {
      const [{ data: t, error: tErr }, { data: reg, error: rErr }, { count: paidCount, error: cErr }] = await Promise.all([
        supabase.from('tournaments').select('*').eq('id', id).single(),
        supabase.from('tournament_registrations')
          .select('id, payment_status')
          .eq('tournament_id', id)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('tournament_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', id)
          .eq('payment_status', 'paid'),
      ])
      if (tErr) throw tErr
      if (rErr) throw rErr
      if (cErr) throw cErr
      setTournament(t)
      if (reg?.payment_status === 'paid') {
        setAlreadyRegistered(true)
        fetchPlayers()
      }
      if (t?.max_players != null && paidCount >= t.max_players) setAlreadyRegistered('full')
    } catch (err) {
      setError(err.message || 'Failed to load tournament.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlayers() {
    const { data } = await supabase
      .from('tournament_registrations')
      .select('user_id, users(name)')
      .eq('tournament_id', id)
      .eq('payment_status', 'paid')
      .order('registered_at', { ascending: true })
    setPlayers(data || [])
  }

  async function handleRegister() {
    setError('')
    setPaying(true)

    try {
      // Free tournament — write registration directly, no payment needed
      if (!tournament.entry_fee || tournament.entry_fee === 0) {
        const { error: regError } = await supabase
          .from('tournament_registrations')
          .upsert({ tournament_id: id, user_id: user.id, payment_status: 'paid' },
            { onConflict: 'tournament_id,user_id' })
        if (regError) throw regError
        await fetchPlayers()
        setSuccess(true)
        setPaying(false)
        return
      }

      // Paid tournament — create Razorpay order first, no DB write yet
      const { data: order, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: tournament.entry_fee * 100, tournamentId: id },
      })
      if (orderError) throw new Error(order?.error || orderError.message)

      await initiatePayment({
        options: {
          amount: tournament.entry_fee * 100,
          orderId: order.id,
          name: "Pawn's Gambit",
          description: `Registration: ${tournament.name}`,
          prefill: {
            name: profile?.name,
            email: user.email,
            contact: profile?.phone,
          },
        },
        onSuccess: async (paymentId, orderId, signature) => {
          // Payment done — verify signature and create registration server-side
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
            body: { paymentId, orderId, signature, tournamentId: id, userId: user.id },
          })
          if (verifyError) {
            setError(verifyData?.error || 'Payment verified but registration failed. Contact support with payment ID: ' + paymentId)
          } else {
            await fetchPlayers()
            setSuccess(true)
          }
          setPaying(false)
        },
        onFailure: (err) => {
          setError(err.message || 'Payment cancelled. You have not been charged.')
          setPaying(false)
        },
      })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (showProfileStep) {
    return (
      <ProfileStep
        profile={profile}
        userId={user.id}
        fetchProfile={fetchProfile}
        onDone={() => { profileStepDismissed.current = true; setShowProfileStep(false) }}
      />
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Tournament not found.{' '}
        <Link to="/tournaments" className="text-blue-400 ml-1">Go back</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-lg mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={30} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">You're registered!</h2>
            <p className="text-white/50 text-sm">Confirmation sent to {user.email}</p>
          </div>

          {/* Tournament details */}
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-4">
            <h3 className="text-white font-semibold text-lg mb-4">{tournament.name}</h3>
            <div className="space-y-2.5 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="flex-shrink-0" />
                <span>{new Date(tournament.date).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                })}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span>{tournament.is_online ? 'Online' : tournament.venue || 'TBD'}</span>
                </div>
                {!tournament.is_online && tournament.location_link && (
                  <a href={tournament.location_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition-colors font-medium ml-5">
                    <MapPin size={10} /> View on Maps
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={14} className="flex-shrink-0" />
                <span>{tournament.format}{tournament.registered_count > 1 ? ` — ${Math.ceil(Math.log2(tournament.registered_count))} rounds` : ''}</span>
              </div>
            </div>
          </div>

          {/* Player list */}
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              Registered Players
              <span className="ml-auto text-slate-500 text-sm font-normal">{players.length}{tournament.max_players ? ` / ${tournament.max_players}` : ''}</span>
            </h3>
            {players.length === 0 ? (
              <p className="text-slate-500 text-sm">No players yet.</p>
            ) : (
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <span className="text-slate-600 font-mono text-xs w-5 text-right">{i + 1}</span>
                    <span className={`text-sm font-medium ${p.user_id === user.id ? 'text-green-400' : 'text-white/80'}`}>
                      {p.users?.name ?? '—'}
                    </span>
                    {p.user_id === user.id && (
                      <span className="text-[10px] text-green-500/70 bg-green-500/10 px-1.5 py-0.5 rounded">you</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/tournaments" className="flex-1 py-2.5 text-center border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-xl text-sm transition-colors">
              All Tournaments
            </Link>
            <Link to="/profile" className="flex-1 py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors">
              My Profile
            </Link>
          </div>

        </div>
      </div>
    )
  }

  if (alreadyRegistered === 'full') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Tournament Full</h2>
          <p className="text-white/70 mb-6">All spots for <strong className="text-white">{tournament?.name}</strong> have been filled.</p>
          <Link to="/tournaments" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors">
            See Other Tournaments
          </Link>
        </div>
      </div>
    )
  }

  if (alreadyRegistered) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-lg mx-auto">

          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={30} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Already registered</h2>
            <p className="text-white/50 text-sm">You're in for {tournament.name}</p>
          </div>

          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-4">
            <h3 className="text-white font-semibold text-lg mb-4">{tournament.name}</h3>
            <div className="space-y-2.5 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="flex-shrink-0" />
                <span>{new Date(tournament.date).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
                })}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span>{tournament.is_online ? 'Online' : tournament.venue || 'TBD'}</span>
                </div>
                {!tournament.is_online && tournament.location_link && (
                  <a href={tournament.location_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition-colors font-medium ml-5">
                    <MapPin size={10} /> View on Maps
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Trophy size={14} className="flex-shrink-0" />
                <span>{tournament.format}{tournament.registered_count > 1 ? ` — ${Math.ceil(Math.log2(tournament.registered_count))} rounds` : ''}</span>
              </div>
            </div>
          </div>

          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              Registered Players
              <span className="ml-auto text-slate-500 text-sm font-normal">{players.length}{tournament.max_players ? ` / ${tournament.max_players}` : ''}</span>
            </h3>
            {players.length === 0 ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : (
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <span className="text-slate-600 font-mono text-xs w-5 text-right">{i + 1}</span>
                    <span className={`text-sm font-medium ${p.user_id === user.id ? 'text-green-400' : 'text-white/80'}`}>
                      {p.users?.name ?? '—'}
                    </span>
                    {p.user_id === user.id && (
                      <span className="text-[10px] text-green-500/70 bg-green-500/10 px-1.5 py-0.5 rounded">you</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Link to="/tournaments" className="flex-1 py-2.5 text-center border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-xl text-sm transition-colors">
              All Tournaments
            </Link>
            <Link to="/profile" className="flex-1 py-2.5 text-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors">
              My Profile
            </Link>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/tournaments" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-6">
          ← All Tournaments
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Register</h1>
        <p className="text-white/70 mb-8">Confirm your spot in this tournament</p>

        {/* Tournament Summary */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">{tournament.name}</h2>
          <div className="space-y-3 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>
                {new Date(tournament.date).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                <span>{tournament.is_online ? 'Online' : tournament.venue || 'TBD'}</span>
              </div>
              {!tournament.is_online && tournament.location_link && (
                <a href={tournament.location_link} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 transition-colors font-medium ml-5">
                  <MapPin size={10} /> View on Maps
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={14} />
              <span>{tournament.format}{tournament.registered_count > 1 ? ` — ${Math.ceil(Math.log2(tournament.registered_count))} rounds` : ''}</span>
            </div>
          </div>

          <hr className="border-navy-600 my-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <IndianRupee size={14} />
              <span>Entry Fee</span>
            </div>
            <span className="text-white font-semibold text-xl">
              {tournament.entry_fee ? `₹${tournament.entry_fee.toLocaleString('en-IN')}` : 'Free'}
            </span>
          </div>
          {tournament.prize_pool && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-white/60 text-sm">Prize Pool</span>
              <span className="text-green-400 text-sm font-medium">{tournament.prize_pool}</span>
            </div>
          )}
        </div>

        {/* Player Info */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-medium mb-3">Registering as</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center text-sm font-bold text-white">
              {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'}
            </div>
            <div>
              <p className="text-white font-medium">{profile?.name}</p>
              <p className="text-white/60 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={paying}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-lg transition-colors"
        >
          {paying
            ? 'Processing...'
            : tournament.entry_fee
            ? `Pay ₹${tournament.entry_fee.toLocaleString('en-IN')} & Register`
            : 'Register (Free)'}
        </button>

        <p className="text-center text-white/60 text-xs mt-3">
          {tournament.entry_fee
            ? 'Payment processed securely via Razorpay. UPI, cards, and net banking accepted.'
            : 'This tournament has no entry fee.'}
        </p>
      </div>
    </div>
  )
}
