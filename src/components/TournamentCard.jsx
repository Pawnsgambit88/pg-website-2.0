import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Trophy, IndianRupee } from 'lucide-react'

const STATUS_STYLES = {
  upcoming:           'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  registration_open:  'bg-green-500/20 text-green-300 border border-green-500/30',
  ongoing:            'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  completed:          'bg-slate-500/20 text-slate-400 border border-slate-500/30',
}

const STATUS_LABELS = {
  upcoming:           'Upcoming',
  registration_open:  'Registration Open',
  ongoing:            'Ongoing',
  completed:          'Completed',
}

export default function TournamentCard({ tournament, compact = false }) {
  const {
    id,
    name,
    date,
    format,
    rounds,
    venue,
    is_online,
    entry_fee,
    prize_pool,
    registered_count = 0,
    max_players,
    status,
  } = tournament

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : ''

  const isRegistrationOpen = status === 'registration_open'
  const isCompleted = status === 'completed'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-slate-900 font-semibold text-lg leading-snug">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.upcoming}`}>
          {STATUS_LABELS[status] || 'Upcoming'}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="flex-shrink-0" />
          <span>{is_online ? 'Online' : venue || 'TBD'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy size={14} className="flex-shrink-0" />
          <span>{format}{rounds ? ` — ${rounds} rounds` : ''}</span>
        </div>
        {!compact && (
          <>
            <div className="flex items-center gap-2">
              <IndianRupee size={14} className="flex-shrink-0" />
              <span>Entry: ₹{entry_fee?.toLocaleString('en-IN') ?? '0'}</span>
              {prize_pool && <span className="text-slate-500">· Prize: {prize_pool}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="flex-shrink-0" />
              <span>
                {registered_count} / {max_players ?? '∞'} registered
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action */}
      <div className="mt-auto pt-2">
        {isRegistrationOpen ? (
          <Link
            to={`/tournaments/${id}/register`}
            className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Register
          </Link>
        ) : isCompleted ? (
          <Link
            to={`/tournaments/${id}/results`}
            className="block w-full text-center px-4 py-2 border border-gray-300 hover:border-gray-400 text-slate-600 hover:text-slate-900 text-sm font-medium rounded-lg transition-colors"
          >
            View Results
          </Link>
        ) : (
          <Link
            to={`/tournaments/${id}`}
            className="block w-full text-center px-4 py-2 border border-gray-300 hover:border-gray-400 text-slate-600 hover:text-slate-900 text-sm font-medium rounded-lg transition-colors"
          >
            View Details
          </Link>
        )}
      </div>
    </div>
  )
}
