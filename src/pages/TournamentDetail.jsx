import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Trophy, Users, IndianRupee, ArrowLeft, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUS_STYLES = {
  upcoming:          'bg-blue-50 text-blue-700 border border-blue-200',
  registration_open: 'bg-green-50 text-green-700 border border-green-200',
  ongoing:           'bg-indigo-50 text-indigo-700 border border-indigo-200',
  completed:         'bg-slate-100 text-slate-600 border border-slate-200',
}

const STATUS_LABELS = {
  upcoming:          'Upcoming',
  registration_open: 'Registration Open',
  ongoing:           'Live',
  completed:         'Completed',
}

function RankBadge({ index }) {
  if (index === 0) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs"
      style={{ color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d' }}>1</span>
  )
  if (index === 1) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs"
      style={{ color: '#374151', background: '#f3f4f6', border: '1px solid #d1d5db' }}>2</span>
  )
  if (index === 2) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs"
      style={{ color: '#92400e', background: '#fff7ed', border: '1px solid #fed7aa' }}>3</span>
  )
  return <span className="font-mono text-slate-400 text-sm">#{index + 1}</span>
}

function scoreLabel(s) {
  if (s === 1)   return '1'
  if (s === 0)   return '0'
  if (s === 0.5) return '½'
  return '–'
}

function PairingTable({ pairings, playerMap }) {
  if (!pairings.length) {
    return <div className="py-10 text-center text-slate-400 text-sm">No pairings for this round.</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ minWidth: 680 }}>
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th className="px-3 py-2.5 text-center w-10">Bo.</th>
            <th className="px-2 py-2.5 text-center w-10">No.</th>
            <th className="px-4 py-2.5 text-left">White</th>
            <th className="px-3 py-2.5 text-right w-14">Rtg</th>
            <th className="px-3 py-2.5 text-right w-12">Pts.</th>
            <th className="px-5 py-2.5 text-center w-28 border-x border-gray-200 bg-slate-100">Result</th>
            <th className="px-3 py-2.5 text-left w-12">Pts.</th>
            <th className="px-4 py-2.5 text-right">Black</th>
            <th className="px-3 py-2.5 text-left w-14">Rtg</th>
            <th className="px-2 py-2.5 text-center w-10">No.</th>
          </tr>
        </thead>
        <tbody>
          {pairings.map((p, i) => {
            const w = playerMap[p.player1_id] || { name: p.player1?.name || 'BYE', rating: null, score: null, no: null }
            const b = playerMap[p.player2_id] || { name: p.player2?.name || 'BYE', rating: null, score: null, no: null }
            const r = p.result
            const pending = r == null
            const wScore = scoreLabel(r)
            const bScore = r == null ? '–' : scoreLabel(1 - r)
            const wWon = r === 1, bWon = r === 0, isDraw = r === 0.5

            return (
              <tr key={p.id} className={`border-b border-gray-100 transition-colors ${
                i % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/40 hover:bg-blue-50/30'
              }`}>
                <td className="px-3 py-3 text-center font-mono text-xs text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-2 py-3 text-center font-mono text-xs text-slate-500 tabular-nums">{w.no ?? '–'}</td>
                <td className={`px-4 py-3 font-medium ${wWon ? 'text-slate-900' : bWon ? 'text-slate-400' : 'text-slate-700'}`}>
                  {wWon && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 mb-0.5" />}
                  {w.name}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-slate-400 tabular-nums">{w.rating ?? '–'}</td>
                <td className="px-3 py-3 text-right font-mono text-xs text-blue-600 tabular-nums font-semibold">
                  {w.score != null ? w.score : '–'}
                </td>
                <td className="px-5 py-3 text-center border-x border-gray-200 bg-slate-50">
                  <span className={`font-mono font-bold tabular-nums tracking-wider ${
                    pending ? 'text-slate-300' : isDraw ? 'text-slate-500' : 'text-slate-900'
                  }`}>
                    {pending ? '? – ?' : `${wScore} – ${bScore}`}
                  </span>
                </td>
                <td className="px-3 py-3 text-left font-mono text-xs text-blue-600 tabular-nums font-semibold">
                  {b.score != null ? b.score : '–'}
                </td>
                <td className={`px-4 py-3 font-medium text-right ${bWon ? 'text-slate-900' : wWon ? 'text-slate-400' : 'text-slate-700'}`}>
                  {b.name}
                  {bWon && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-2 mb-0.5" />}
                </td>
                <td className="px-3 py-3 text-left font-mono text-xs text-slate-400 tabular-nums">{b.rating ?? '–'}</td>
                <td className="px-2 py-3 text-center font-mono text-xs text-slate-500 tabular-nums">{b.no ?? '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function TournamentDetail() {
  const { id } = useParams()
  const [tournament, setTournament]           = useState(null)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [rounds, setRounds]                   = useState([])
  const [standings, setStandings]             = useState([])
  const [activeRound, setActiveRound]         = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [tab, setTab]                         = useState('standings')

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: t, error: tErr }, { count, error: cErr }] = await Promise.all([
          supabase.from('tournaments').select('*').eq('id', id).single(),
          supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', id)
            .eq('payment_status', 'paid'),
        ])
        if (tErr) throw tErr
        if (cErr) throw cErr

        setTournament(t)
        setRegisteredCount(count ?? 0)

        if (t && (t.status === 'ongoing' || t.status === 'completed')) {
          const [{ data: roundsData }, { data: regs }] = await Promise.all([
            supabase
              .from('tournament_rounds')
              .select('*, pairings(*, player1:player1_id(name), player2:player2_id(name))')
              .eq('tournament_id', id)
              .order('round_number', { ascending: true }),
            supabase
              .from('tournament_registrations')
              .select('*, users(name, ratings(rating, time_control)), rating_before, rating_after')
              .eq('tournament_id', id)
              .eq('payment_status', 'paid'),
          ])
          setRounds(roundsData || [])
          setStandings(regs || [])
          if (roundsData?.length) setActiveRound(roundsData[roundsData.length - 1].id)
        }
      } catch (err) {
        console.error('TournamentDetail fetch:', err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Compute scores and per-round results from pairings (source of truth)
  const computedScores = {}
  const roundResultMap = {}
  for (const round of rounds) {
    for (const p of round.pairings || []) {
      if (p.result == null) continue
      const r = Number(p.result)
      if (p.player1_id) {
        computedScores[p.player1_id] = (computedScores[p.player1_id] ?? 0) + r
        if (!roundResultMap[p.player1_id]) roundResultMap[p.player1_id] = {}
        roundResultMap[p.player1_id][round.id] = r
      }
      if (p.player2_id) {
        const s2 = 1 - r
        computedScores[p.player2_id] = (computedScores[p.player2_id] ?? 0) + s2
        if (!roundResultMap[p.player2_id]) roundResultMap[p.player2_id] = {}
        roundResultMap[p.player2_id][round.id] = s2
      }
    }
  }

  const sortedStandings = [...standings].sort((a, b) =>
    (computedScores[b.user_id] ?? -1) - (computedScores[a.user_id] ?? -1)
  )

  const tc = tournament?.time_control ?? 'rapid'
  const playerMap = {}
  sortedStandings.forEach((reg, i) => {
    playerMap[reg.user_id] = {
      name:   reg.users?.name ?? '—',
      rating: reg.users?.ratings?.find(r => r.time_control === tc)?.rating ?? null,
      score:  computedScores[reg.user_id] ?? null,
      no:     i + 1,
    }
  })

  const activePairings = rounds.find(r => r.id === activeRound)?.pairings || []
  const activeRoundObj = rounds.find(r => r.id === activeRound)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Tournament not found.{' '}
        <Link to="/tournaments" className="text-blue-500 ml-1 hover:underline">Go back</Link>
      </div>
    )
  }

  const formattedDate = tournament.date
    ? new Date(tournament.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—'

  const formattedDeadline = tournament.registration_deadline
    ? new Date(tournament.registration_deadline).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : null

  const spotsLeft = tournament.max_players != null ? tournament.max_players - registeredCount : null
  const isFull = spotsLeft !== null && spotsLeft <= 0
  const showResults = tournament.status === 'ongoing' || tournament.status === 'completed'

  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4" style={{ background: '#f8f9fb' }}>
      <div className="relative z-10 max-w-6xl mx-auto">

        <Link to="/tournaments" className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 mb-6">
          <ArrowLeft size={14} /> All Tournaments
        </Link>

        <div className="grid md:grid-cols-[320px_1fr] gap-8 items-start">

          {/* ══ LEFT — tournament details ════════════════════════════════ */}
          <div className="space-y-4">
            <div>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${STATUS_STYLES[tournament.status] || STATUS_STYLES.upcoming}`}>
                {STATUS_LABELS[tournament.status] || 'Upcoming'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{tournament.name}</h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3.5 shadow-sm">
              <Row icon={<Calendar size={15} />} label="Date & Time"  value={formattedDate} />
              <Row
                icon={<MapPin size={15} />}
                label="Location"
                value={
                  tournament.is_online ? 'Online' : (
                    <span className="flex flex-col items-end gap-1">
                      <span>{tournament.venue || 'TBD'}</span>
                      {tournament.location_link && (
                        <a
                          href={tournament.location_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors font-medium"
                        >
                          <MapPin size={10} /> View on Maps
                        </a>
                      )}
                    </span>
                  )
                }
              />
              <Row icon={<Trophy size={15} />}   label="Format"       value={tournament.format} />
              <Row
                icon={<IndianRupee size={15} />}
                label="Entry Fee"
                value={tournament.entry_fee ? `₹${tournament.entry_fee.toLocaleString('en-IN')}` : 'Free'}
              />
              {tournament.prize_pool && (
                <Row icon={<Trophy size={15} />} label="Prize Pool" value={tournament.prize_pool} highlight />
              )}
              <Row
                icon={<Users size={15} />}
                label="Registered"
                value={
                  tournament.max_players != null
                    ? `${registeredCount} / ${tournament.max_players}${spotsLeft != null ? ` (${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left)` : ''}`
                    : `${registeredCount} players`
                }
              />
              {formattedDeadline && (
                <Row icon={<Clock size={15} />} label="Reg. Deadline" value={formattedDeadline} />
              )}
            </div>

            {tournament.status === 'registration_open' && !isFull && (
              <Link
                to={`/tournaments/${id}/register`}
                className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Register Now
              </Link>
            )}
            {tournament.status === 'registration_open' && isFull && (
              <div className="w-full text-center py-3 bg-red-50 text-red-600 border border-red-200 font-semibold rounded-xl text-sm">
                Tournament Full
              </div>
            )}
            {tournament.status === 'upcoming' && (
              <div className="w-full text-center py-3 bg-gray-100 text-slate-500 font-semibold rounded-xl text-sm">
                Registration not yet open
              </div>
            )}
            {tournament.status === 'ongoing' && (
              <div className="w-full text-center py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold rounded-xl text-sm">
                Tournament in progress
              </div>
            )}
            {tournament.status === 'completed' && (
              <div className="w-full text-center py-3 bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-xl text-sm">
                Tournament completed
              </div>
            )}
          </div>

          {/* ══ RIGHT — standings / pairings ════════════════════════════ */}
          {showResults ? (
            <div className="min-w-0">
              {/* Tab bar */}
              <div className="flex gap-0 border-b border-gray-200 mb-5">
                {[
                  { key: 'standings', label: 'Standings' },
                  { key: 'pairings',  label: 'Pairings'  },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      tab === key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Standings ─────────────────────────────────────────── */}
              {tab === 'standings' && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <th className="px-5 py-3 text-left w-16">Rank</th>
                          <th className="px-4 py-3 text-left">Player</th>
                          {rounds.map(r => (
                            <th key={r.id} className="px-3 py-3 text-center w-12">
                              R{r.round_number}
                              {r.is_complete && (
                                <span className="block text-[9px] text-green-500 normal-case tracking-normal font-normal">done</span>
                              )}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right">Points</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Δ Rtg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStandings.length === 0 ? (
                          <tr>
                            <td colSpan={4 + rounds.length} className="px-5 py-8 text-center text-slate-400">
                              No players registered yet.
                            </td>
                          </tr>
                        ) : sortedStandings.map((reg, index) => {
                          const before = reg.rating_before
                          const after  = reg.rating_after
                          const delta  = after != null && before != null ? after - before : null
                          const total  = computedScores[reg.user_id]
                          return (
                            <tr key={reg.id} className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${
                              index === 0 ? 'bg-yellow-50/40' : index % 2 === 0 ? 'bg-white' : 'bg-gray-200'
                            }`}>
                              <td className="px-5 py-4"><RankBadge index={index} /></td>
                              <td className="px-4 py-4 font-medium text-slate-900">{reg.users?.name ?? '—'}</td>
                              {rounds.map(r => {
                                const s = roundResultMap[reg.user_id]?.[r.id]
                                return (
                                  <td key={r.id} className="px-3 py-4 text-center font-mono text-xs tabular-nums">
                                    {s != null
                                      ? <span className={s === 1 ? 'text-green-600 font-bold' : s === 0 ? 'text-red-400' : 'text-slate-500'}>{scoreLabel(s)}</span>
                                      : <span className="text-slate-300">–</span>
                                    }
                                  </td>
                                )
                              })}
                              <td className="px-4 py-4 text-right font-mono font-bold text-slate-900">
                                {total != null ? total : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-xs">
                                {delta != null ? (
                                  <span className={delta >= 0 ? 'text-green-600' : 'text-red-500'}>
                                    {delta >= 0 ? '+' : ''}{delta}
                                  </span>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Pairings ──────────────────────────────────────────── */}
              {tab === 'pairings' && (
                rounds.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-slate-400 shadow-sm">
                    <Trophy size={32} className="mx-auto mb-2 opacity-20" />
                    <p>No rounds yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {rounds.map(round => (
                        <button
                          key={round.id}
                          onClick={() => setActiveRound(round.id)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                            activeRound === round.id
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-gray-200'
                          }`}
                        >
                          R{round.round_number}
                          {round.is_complete && (
                            <span className={`text-[10px] ${activeRound === round.id ? 'text-blue-200' : 'text-green-500'}`}>✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      {activeRoundObj && (
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-700">Round {activeRoundObj.round_number}</span>
                          {activeRoundObj.is_complete && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Complete</span>
                          )}
                        </div>
                      )}
                      <PairingTable pairings={activePairings} playerMap={playerMap} />
                    </div>
                  </>
                )
              )}
            </div>

          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <Trophy size={44} className="mx-auto mb-4 text-slate-200" />
              <p className="font-semibold text-slate-600">No results yet</p>
              <p className="text-sm text-slate-400 mt-1">Standings will appear once the tournament begins.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, value, highlight = false }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
        <span className="text-slate-500 text-sm flex-shrink-0">{label}</span>
        <span className={`text-sm font-medium text-right ${highlight ? 'text-green-600' : 'text-slate-900'}`}>{value}</span>
      </div>
    </div>
  )
}
