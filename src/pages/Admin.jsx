import { useEffect, useState } from 'react'
import { Plus, Trophy, Users, Download, RefreshCw, CheckCircle, AlertCircle, Shuffle, UserX, UserCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Swiss pairing (FIDE-style simplified)
// Round 1: top half vs bottom half (seeded by rating)
// Later rounds: sort by score/rating, pair within score groups, no rematches
// Color: tracks last 2 colours per player — never allows 3 same in a row
function buildSwissPairings(players, previousPairings) {
  const isRound1 = previousPairings.filter(p => p.player1_id).length === 0

  const sorted = [...players].sort((a, b) => {
    const sd = (b.score ?? 0) - (a.score ?? 0)
    return sd !== 0 ? sd : (b.rating ?? 1500) - (a.rating ?? 1500)
  })

  // Canonical set of already-played pairs
  const played = new Set(
    previousPairings
      .filter(p => p.player1_id && p.player2_id)
      .map(p => [p.player1_id, p.player2_id].sort().join(':'))
  )

  // Per-player colour history (last 2 entries: 'W' or 'B')
  const colorBal = {}   // net: positive = more whites
  const recentColors = {}
  for (const p of players) { colorBal[p.user_id] = 0; recentColors[p.user_id] = [] }
  for (const prev of previousPairings) {
    if (prev.player1_id) {
      colorBal[prev.player1_id] = (colorBal[prev.player1_id] ?? 0) + 1
      recentColors[prev.player1_id] = [...(recentColors[prev.player1_id] ?? []).slice(-1), 'W']
    }
    if (prev.player2_id) {
      colorBal[prev.player2_id] = (colorBal[prev.player2_id] ?? 0) - 1
      recentColors[prev.player2_id] = [...(recentColors[prev.player2_id] ?? []).slice(-1), 'B']
    }
  }

  // Assign white/black respecting the "no 3 same colour in a row" rule
  function assignColors(pA, pB) {
    const aLast2 = recentColors[pA.user_id] ?? []
    const bLast2 = recentColors[pB.user_id] ?? []
    const aMustBeBlack = aLast2.length === 2 && aLast2[0] === 'W' && aLast2[1] === 'W'
    const bMustBeBlack = bLast2.length === 2 && bLast2[0] === 'W' && bLast2[1] === 'W'
    if (aMustBeBlack && !bMustBeBlack) return [pB, pA]
    if (bMustBeBlack && !aMustBeBlack) return [pA, pB]
    // Fall back to net balance: player with more blacks gets white
    return colorBal[pA.user_id] <= colorBal[pB.user_id] ? [pA, pB] : [pB, pA]
  }

  const result = []

  if (isRound1) {
    // Split sorted-by-rating field in half: 1st vs (n/2+1)th, 2nd vs (n/2+2)th …
    const half = Math.floor(sorted.length / 2)
    for (let i = 0; i < half; i++) {
      const [white, black] = assignColors(sorted[i], sorted[half + i])
      result.push({ player1_id: white.user_id, player2_id: black.user_id })
    }
    // Odd player out (lowest rated) gets a bye
    if (sorted.length % 2 === 1) {
      result.push({ player1_id: sorted[sorted.length - 1].user_id, player2_id: null, result: 0.5 })
    }
  } else {
    // Subsequent rounds: greedy within score groups, no rematches
    const unpaired = [...sorted]
    while (unpaired.length >= 2) {
      const player = unpaired.shift()
      // Find first opponent in same/nearby score group they haven't played
      let idx = unpaired.findIndex(o => !played.has([player.user_id, o.user_id].sort().join(':')))
      if (idx === -1) idx = 0  // allow rematch only if unavoidable
      const opponent = unpaired.splice(idx, 1)[0]
      const [white, black] = assignColors(player, opponent)
      result.push({ player1_id: white.user_id, player2_id: black.user_id })
      played.add([player.user_id, opponent.user_id].sort().join(':'))
    }
    // Bye for the lowest-scoring unpaired player
    if (unpaired.length === 1) {
      result.push({ player1_id: unpaired[0].user_id, player2_id: null, result: 0.5 })
    }
  }

  return result
}

const INITIAL_TOURNAMENT_FORM = {
  name: '', date: '', format: '', venue: '', location_link: '',
  is_online: false, entry_fee: '', prize_pool: '', max_players: '',
  status: 'upcoming', registration_deadline: '', time_control: 'rapid',
}

export default function Admin() {
  const [view, setView] = useState('tournaments') // tournaments | create | manage
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [rounds, setRounds] = useState([])
  const [pairings, setPairings] = useState({}) // roundId -> pairings[]
  const [activeRound, setActiveRound] = useState(null)
  const [form, setForm] = useState(INITIAL_TOURNAMENT_FORM)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  async function fetchTournaments() {
    const { data } = await supabase
      .from('tournaments')
      .select('*, tournament_registrations(count)')
      .order('date', { ascending: false })
    setTournaments(
      (data || []).map(t => ({ ...t, registered_count: t.tournament_registrations?.[0]?.count ?? 0 }))
    )
  }

  async function openManage(tournament) {
    setSelectedTournament(tournament)
    setView('manage')

    const [{ data: regs }, { data: roundsData }] = await Promise.all([
      supabase
        .from('tournament_registrations')
        .select('*, users(id, name, ratings(rating, rd, volatility, time_control))')
        .eq('tournament_id', tournament.id)
        .order('registered_at', { ascending: true }),
      supabase
        .from('tournament_rounds')
        .select('*, pairings(*)')
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: true }),
    ])

    setRegistrations(regs || [])
    setRounds(roundsData || [])

    const pairMap = {}
    for (const r of roundsData || []) {
      pairMap[r.id] = r.pairings || []
    }
    setPairings(pairMap)

    if (roundsData?.length) setActiveRound(roundsData[roundsData.length - 1].id)
  }

  function setFormField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreateTournament(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const toIST = v => v ? v + ':00+05:30' : null
    try {
      const { error } = await supabase.from('tournaments').insert({
        name: form.name,
        date: toIST(form.date),
        format: form.format,
        venue: form.venue,
        is_online: form.is_online,
        entry_fee: parseFloat(form.entry_fee) || 0,
        prize_pool: form.prize_pool,
        max_players: parseInt(form.max_players) || null,
        status: form.status,
        registration_deadline: toIST(form.registration_deadline),
        time_control: form.time_control,
        location_link: form.location_link || null,
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Tournament created successfully!' })
      setForm(INITIAL_TOURNAMENT_FORM)
      fetchTournaments()
      setTimeout(() => setView('tournaments'), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(tournamentId, newStatus) {
    const { error } = await supabase.from('tournaments').update({ status: newStatus }).eq('id', tournamentId)
    if (error) {
      setMessage({ type: 'error', text: `Status update failed: ${error.message}` })
      return
    }
    fetchTournaments()
    if (selectedTournament?.id === tournamentId) {
      setSelectedTournament(prev => ({ ...prev, status: newStatus }))
    }
  }

  async function addRound() {
    if (rounds.length > 0) {
      const lastRound = rounds[rounds.length - 1]
      const lastPairings = pairings[lastRound.id] || []
      const missing = lastPairings.filter(p => p.player1_id != null && p.result == null)
      if (missing.length > 0) {
        setMessage({ type: 'error', text: `Enter all results for Round ${lastRound.round_number} before adding a new round.` })
        return
      }
    }

    const nextNum = rounds.length + 1
    const { data, error } = await supabase
      .from('tournament_rounds')
      .insert({ tournament_id: selectedTournament.id, round_number: nextNum, is_complete: false })
      .select()
      .single()
    if (!error) {
      const newRound = { ...data, pairings: [] }
      setRounds(prev => [...prev, newRound])
      setPairings(prev => ({ ...prev, [data.id]: [] }))
      setActiveRound(data.id)
    }
  }

  async function addPairing(roundId) {
    const { data, error } = await supabase
      .from('pairings')
      .insert({ round_id: roundId, player1_id: null, player2_id: null, result: null })
      .select()
      .single()
    if (!error) {
      setPairings(prev => ({ ...prev, [roundId]: [...(prev[roundId] || []), data] }))
    }
  }

  async function generateSwissPairings(roundId) {
    const existing = pairings[roundId] || []
    if (existing.length > 0 && !window.confirm('Replace existing pairings for this round?')) return

    setLoading(true)
    setMessage(null)
    try {
      // Delete any existing pairings for this round first
      if (existing.length > 0) {
        await supabase.from('pairings').delete().eq('round_id', roundId)
      }

      // All pairings from other rounds (to avoid rematches)
      const prevPairings = rounds
        .filter(r => r.id !== roundId)
        .flatMap(r => pairings[r.id] || [])

      // Paid, present players with score + rating (no-shows excluded)
      const players = registrations
        .filter(r => r.payment_status === 'paid' && (r.is_pairing_active ?? true))
        .map(r => ({
          user_id: r.user_id,
          score: r.score ?? 0,
          rating: r.users?.ratings?.find(rt => rt.time_control === selectedTournament.time_control)?.rating ?? 1500,
        }))

      if (players.length < 2) throw new Error('Need at least 2 paid players to generate pairings.')

      const newPairings = buildSwissPairings(players, prevPairings)

      const { data, error } = await supabase
        .from('pairings')
        .insert(newPairings.map(p => ({ round_id: roundId, ...p, result: p.result ?? null })))
        .select()

      if (error) throw error

      setPairings(prev => ({ ...prev, [roundId]: data }))
      setMessage({ type: 'success', text: `Generated ${data.length} Swiss pairing${data.length !== 1 ? 's' : ''}.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function updatePairingField(roundId, pairingId, field, value) {
    const prevPairings = pairings[roundId]
    const updatedRoundPairings = prevPairings.map(p => p.id === pairingId ? { ...p, [field]: value } : p)
    setPairings(prev => ({ ...prev, [roundId]: updatedRoundPairings }))

    const { error } = await supabase.from('pairings').update({ [field]: value }).eq('id', pairingId)
    if (error) {
      setPairings(prev => ({ ...prev, [roundId]: prevPairings }))
      setMessage({ type: 'error', text: `Failed to save pairing: ${error.message}` })
      return
    }

    if (field === 'result') {
      const updatedPairing = updatedRoundPairings.find(p => p.id === pairingId)
      if (!updatedPairing) return

      const allPairings = Object.values({ ...pairings, [roundId]: updatedRoundPairings }).flat()

      const calcScore = userId => allPairings.reduce((sum, p) => {
        if (p.result == null) return sum
        if (p.player1_id === userId) return sum + p.result
        if (p.player2_id === userId) return sum + (1 - p.result)
        return sum
      }, 0)

      const affected = [updatedPairing.player1_id, updatedPairing.player2_id].filter(Boolean)
      for (const userId of affected) {
        const reg = registrations.find(r => r.user_id === userId)
        if (!reg) continue
        const newScore = calcScore(userId)
        setRegistrations(prev => prev.map(r => r.user_id === userId ? { ...r, score: newScore } : r))
        await supabase.from('tournament_registrations').update({ score: newScore }).eq('id', reg.id)
      }
    }
  }

  async function markRoundComplete(roundId) {
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('tournament_rounds')
        .update({ is_complete: true })
        .eq('id', roundId)
      if (error) throw error
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, is_complete: true } : r))
      setMessage({ type: 'success', text: 'Round marked as complete.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function updateRatingsForRound(roundId) {
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.functions.invoke('update-ratings', {
        body: { roundId, tournamentId: selectedTournament.id },
      })
      if (error) throw error
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, is_complete: true } : r))
      setMessage({ type: 'success', text: `Ratings updated for ${data.updatedPlayers} players!` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function togglePairingActive(reg) {
    const next = !(reg.is_pairing_active ?? true)
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, is_pairing_active: next } : r))
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ is_pairing_active: next })
      .eq('id', reg.id)
    if (error) {
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, is_pairing_active: reg.is_pairing_active } : r))
      setMessage({ type: 'error', text: `Failed to update: ${error.message}` })
    }
  }

  async function exportCSV() {
    if (!selectedTournament) return
    const { data } = await supabase
      .from('tournament_registrations')
      .select('*, users(name, email, city, chess_com_username, fide_id), ratings!users(rating, rd)')
      .eq('tournament_id', selectedTournament.id)

    const rows = [['Name', 'Email', 'City', 'Chess.com', 'FIDE ID', 'PG Rating', 'RD', 'Score', 'Payment Status']]
    for (const r of data || []) {
      rows.push([
        r.users?.name, r.users?.email, r.users?.city,
        r.users?.chess_com_username, r.users?.fide_id,
        r.ratings?.[0]?.rating, r.ratings?.[0]?.rd,
        r.score, r.payment_status,
      ])
    }

    const csv = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTournament.name.replace(/\s+/g, '_')}_registrations.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const StatusSelect = ({ tournamentId, currentStatus }) => (
    <select
      value={currentStatus}
      onChange={e => handleStatusChange(tournamentId, e.target.value)}
      className="bg-navy-900 border border-navy-600 text-white text-xs rounded px-2 py-1 outline-none"
    >
      {['upcoming', 'registration_open', 'ongoing', 'completed'].map(s => (
        <option key={s} value={s}>{s.replace('_', ' ')}</option>
      ))}
    </select>
  )

  const currentRound = rounds.find(r => r.id === activeRound)
  const currentPairings = activeRound ? (pairings[activeRound] || []) : []

  const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null
  const lastRoundPairings = lastRound ? (pairings[lastRound.id] || []) : []
  const missingResults = lastRoundPairings.filter(p => p.player1_id != null && p.result == null)
  const canAddRound = rounds.length === 0 || missingResults.length === 0
  const paidCount = registrations.filter(r => r.payment_status === 'paid').length
  const recommendedRounds = paidCount > 1 ? Math.ceil(Math.log2(paidCount)) : 1

  const registrationOptions = registrations.map(r => ({ value: r.user_id, label: r.users?.name }))

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between py-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="flex gap-2">
            {['tournaments', 'create'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  view === v ? 'text-white' : 'text-white hover:bg-white/10'
                }`}
                style={view === v ? { background: 'linear-gradient(135deg, #FF4500, #FF9900)' } : {}}
              >
                {v === 'tournaments' ? 'All Tournaments' : '+ New Tournament'}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        {/* Tournaments List */}
        {view === 'tournaments' && (
          <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-navy-700 bg-navy-900/40">
                    <th className="px-6 py-3 font-medium">Tournament</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournaments.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No tournaments yet.</td></tr>
                  ) : tournaments.map(t => (
                    <tr key={t.id} className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors">
                      <td className="px-6 py-4 text-white font-medium">{t.name}</td>
                      <td className="px-4 py-4 text-slate-400 text-xs">
                        {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-4 py-4 text-slate-400">{t.registered_count}</td>
                      <td className="px-4 py-4">
                        <StatusSelect tournamentId={t.id} currentStatus={t.status} />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => openManage(t)}
                          className="px-3 py-1 bg-navy-700 hover:bg-navy-600 text-white text-xs rounded-lg transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Tournament Form */}
        {view === 'create' && (
          <div className="max-w-2xl">
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Create Tournament</h2>
              <form onSubmit={handleCreateTournament} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Tournament Name" value={form.name} onChange={v => setFormField('name', v)} placeholder="PG Open #12" required />
                  <Field label="Date & Time" type="datetime-local" value={form.date} onChange={v => setFormField('date', v)} required min={new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16)} />
                  <Field label="Format" value={form.format} onChange={v => setFormField('format', v)} placeholder="Swiss, Rapid 15+10" required />
                  <Field label="Entry Fee (₹)" type="number" value={form.entry_fee} onChange={v => setFormField('entry_fee', v)} placeholder="200" />
                  <Field label="Max Players" type="number" value={form.max_players} onChange={v => setFormField('max_players', v)} placeholder="64" />
                  <Field label="Registration Deadline" type="datetime-local" value={form.registration_deadline} onChange={v => setFormField('registration_deadline', v)} min={new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16)} />
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Initial Status</label>
                    <select
                      value={form.status}
                      onChange={e => setFormField('status', e.target.value)}
                      className="w-full bg-navy-900 border border-navy-600 text-white text-sm rounded-lg px-4 py-3 outline-none"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="registration_open">Registration Open</option>
                    </select>
                  </div>
                </div>
                {/* Time Control selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Time Control</label>
                  <div className="flex gap-2">
                    {['classical', 'rapid', 'blitz'].map(tc => (
                      <button key={tc} type="button"
                        onClick={() => setFormField('time_control', tc)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                          form.time_control === tc
                            ? 'bg-blue-600 text-white'
                            : 'bg-navy-900 border border-navy-600 text-slate-300 hover:border-blue-500'
                        }`}
                      >{tc}</button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Prize Pool" value={form.prize_pool} onChange={v => setFormField('prize_pool', v)} placeholder="1st: ₹2000, 2nd: ₹1000" />
                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="is_online"
                      checked={form.is_online}
                      onChange={e => setFormField('is_online', e.target.checked)}
                      className="accent-blue-500 w-4 h-4"
                    />
                    <label htmlFor="is_online" className="text-slate-300 text-sm">Online tournament</label>
                  </div>
                </div>
                {!form.is_online && (
                  <Field label="Venue" value={form.venue} onChange={v => setFormField('venue', v)} placeholder="Chess Club, Hyderabad" />
                )}
                <Field
                  label="Google Maps Link"
                  value={form.location_link}
                  onChange={v => setFormField('location_link', v)}
                  placeholder="https://maps.app.goo.gl/..."
                  required={!form.is_online}
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setView('tournaments')}
                    className="px-5 py-2.5 border border-gray-300 text-slate-600 hover:text-slate-900 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium rounded-lg text-sm transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Tournament'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manage Tournament */}
        {view === 'manage' && selectedTournament && (
          <div>
            <button
              onClick={() => setView('tournaments')}
              className="text-sm text-white hover:text-white/70 flex items-center gap-1 mb-6"
            >
              ← All Tournaments
            </button>

            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTournament.name}</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {new Date(selectedTournament.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatusSelect tournamentId={selectedTournament.id} currentStatus={selectedTournament.status} />
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            {/* Registrations */}
            <section className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Users size={18} /> Registrations ({registrations.length})
              </h3>
              <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-navy-700 bg-navy-900/40">
                        <th className="px-5 py-3">Player</th>
                        <th className="px-4 py-3 text-right">PG Rating</th>
                        <th className="px-4 py-3 text-right">Payment</th>
                        <th className="px-4 py-3 text-right">Score</th>
                        <th className="px-4 py-3 text-center">Pairing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-6 text-center text-slate-500">No registrations yet.</td></tr>
                      ) : registrations.map(reg => {
                        const active = reg.is_pairing_active ?? true
                        return (
                        <tr key={reg.id} className={`border-b border-navy-700/40 ${!active ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3 text-white">{reg.users?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-400 font-mono">{reg.users?.ratings?.find(rt => rt.time_control === selectedTournament.time_control)?.rating ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              reg.payment_status === 'paid'
                                ? 'bg-green-500/20 text-green-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {reg.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {reg.score != null ? reg.score : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => togglePairingActive(reg)}
                              title={active ? 'Mark as absent (won\'t be paired)' : 'Mark as present (will be paired)'}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                active
                                  ? 'bg-green-500/15 text-green-300 hover:bg-red-500/15 hover:text-red-300'
                                  : 'bg-slate-500/15 text-slate-400 hover:bg-green-500/15 hover:text-green-300'
                              }`}
                            >
                              {active
                                ? <><UserCheck size={11} /> Present</>
                                : <><UserX size={11} /> Absent</>
                              }
                            </button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Rounds & Pairings */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Trophy size={18} /> Rounds
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/20">
                    Recommended: {recommendedRounds}
                  </span>
                </h3>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={addRound}
                    disabled={!canAddRound}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${
                      canAddRound
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : 'bg-blue-900 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={14} /> Add Round
                  </button>
                  {!canAddRound && (
                    <p className="text-xs text-amber-400">
                      Enter all results for Round {lastRound.round_number} first
                    </p>
                  )}
                </div>
              </div>

              {rounds.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  {rounds.map(round => (
                    <button
                      key={round.id}
                      onClick={() => setActiveRound(round.id)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                        activeRound === round.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      Round {round.round_number}
                      {round.is_complete && <CheckCircle size={12} className="text-green-400" />}
                    </button>
                  ))}
                </div>
              )}

              {currentRound && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-slate-900 font-medium">Round {currentRound.round_number} Pairings</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateSwissPairings(currentRound.id)}
                        disabled={loading}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-lg border border-blue-200 disabled:opacity-50"
                      >
                        <Shuffle size={12} /> Generate Swiss
                      </button>
                      <button
                        onClick={() => addPairing(currentRound.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs rounded-lg border border-gray-200"
                      >
                        <Plus size={12} /> Add Pairing
                      </button>
                      {!currentRound.is_complete && (
                        <>
                          <button
                            onClick={() => markRoundComplete(currentRound.id)}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs rounded-lg"
                            title="Close the round without recalculating ratings"
                          >
                            <CheckCircle size={12} />
                            Mark Complete
                          </button>
                          <button
                            onClick={() => updateRatingsForRound(currentRound.id)}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded-lg"
                            title="Close the round and recalculate Glicko-2 ratings"
                          >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Finalise & Update Ratings
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {currentPairings.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4">No pairings. Click "Add Pairing" to start.</p>
                  ) : (
                    <div className="space-y-2">
                      {currentPairings.map(pairing => (
                        <div key={pairing.id} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <select
                            value={pairing.player1_id || ''}
                            onChange={e => updatePairingField(currentRound.id, pairing.id, 'player1_id', e.target.value || null)}
                            className="bg-white border border-gray-200 text-slate-900 text-sm rounded px-3 py-1.5 outline-none w-full"
                          >
                            <option value="">White (Player 1)</option>
                            {registrationOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <select
                            value={pairing.result ?? ''}
                            onChange={e => updatePairingField(currentRound.id, pairing.id, 'result', e.target.value === '' ? null : parseFloat(e.target.value))}
                            className="bg-white border border-gray-200 text-slate-900 text-sm rounded px-2 py-1.5 outline-none"
                          >
                            <option value="">—</option>
                            <option value="1">1 – 0</option>
                            <option value="0.5">½ – ½</option>
                            <option value="0">0 – 1</option>
                          </select>
                          <select
                            value={pairing.player2_id || ''}
                            onChange={e => updatePairingField(currentRound.id, pairing.id, 'player2_id', e.target.value || null)}
                            className="bg-white border border-gray-200 text-slate-900 text-sm rounded px-3 py-1.5 outline-none w-full"
                          >
                            <option value="">Black (Player 2)</option>
                            {registrationOptions.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rounds.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-slate-500">
                  <Trophy size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No rounds yet. Add the first round above.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, required = false, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        className="w-full bg-navy-900 border border-navy-600 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none transition-colors text-sm"
      />
    </div>
  )
}
