import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingUp, Calendar, Hash } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetchHistory() {
      const { data } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournaments(id, name, date, format),
          rating_before,
          rating_after,
          score
        `)
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false })
      setHistory(data || [])
      setLoading(false)
    }
    fetchHistory()
  }, [user])

  const gamesPlayed = (profile?.ratings ?? []).reduce((acc, r) => acc + (r.games_played ?? 0), 0)
  const ratingByType = (tc) => profile?.ratings?.find(r => r.time_control === tc)
  const RATING_COLORS = { classical: 'text-blue-400', rapid: 'text-green-400', blitz: 'text-orange-400' }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-navy-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{profile?.name ?? 'Loading...'}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
                {profile?.city && <span>📍 {profile.city}</span>}
                {profile?.chess_com_username && (
                  <a
                    href={`https://chess.com/member/${profile.chess_com_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    ♟ chess.com/{profile.chess_com_username}
                  </a>
                )}
                {profile?.fide_id && <span>FIDE: {profile.fide_id}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Rating Cards — one per time control */}
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {['classical', 'rapid', 'blitz'].map(tc => {
            const r = ratingByType(tc)
            return (
              <div key={tc} className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center">
                <TrendingUp size={24} className={`mx-auto mb-2 ${RATING_COLORS[tc]}`} />
                <div className="text-4xl font-bold text-white">{r?.rating ?? '—'}</div>
                {r?.rd && <div className="text-slate-400 text-sm mt-1">± {r.rd}</div>}
                <div className="text-slate-500 text-xs mt-1 capitalize">{tc}</div>
              </div>
            )
          })}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center">
            <Hash size={24} className="mx-auto mb-2 text-slate-400" />
            <div className="text-4xl font-bold text-white">{gamesPlayed}</div>
            <div className="text-slate-500 text-xs mt-2">Rated Games</div>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 text-center">
            <Trophy size={24} className="mx-auto mb-2 text-yellow-400" />
            <div className="text-4xl font-bold text-white">{history.length}</div>
            <div className="text-slate-500 text-xs mt-2">Tournaments</div>
          </div>
        </div>

        {/* Tournament History */}
        <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <h2 className="text-white font-semibold">Tournament History</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Trophy size={32} className="mx-auto mb-2 opacity-30" />
              <p>No tournaments played yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-navy-700">
                    <th className="px-6 py-3 font-medium">Tournament</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Score</th>
                    <th className="px-4 py-3 font-medium text-right">Rating Before</th>
                    <th className="px-4 py-3 font-medium text-right">Rating After</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => {
                    const delta = entry.rating_after && entry.rating_before
                      ? entry.rating_after - entry.rating_before
                      : null
                    return (
                      <tr key={entry.id} onClick={() => navigate(`/tournaments/${entry.tournament_id}`)} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium">
                          <div className="text-white">{entry.tournaments?.name ?? '—'}</div>
                          <div className="text-slate-500 text-xs">{entry.tournaments?.format}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {entry.tournaments?.date
                            ? new Date(entry.tournaments.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
                            : '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-white">
                          {entry.score ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-400">
                          {entry.rating_before ?? '—'}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-white">{entry.rating_after ?? '—'}</span>
                          {delta !== null && (
                            <span className={`ml-2 text-xs ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {delta >= 0 ? '+' : ''}{delta}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
