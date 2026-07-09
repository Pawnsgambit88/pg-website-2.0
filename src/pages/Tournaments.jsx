import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Calendar, MapPin, IndianRupee, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

const TABS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['upcoming', 'registration_open'] },
  { key: 'ongoing',  label: 'Ongoing',  statuses: ['ongoing'] },
  { key: 'past',     label: 'Past',     statuses: ['completed'] },
]

const STATUS_META = {
  upcoming:          { label: 'Upcoming',          cls: 'text-white border-white/30',     style: { background: 'rgba(255,255,255,0.15)' } },
  registration_open: { label: 'Registration Open', cls: 'text-green-200 border-green-300', style: { background: 'rgba(34,197,94,0.2)' } },
  ongoing:           { label: 'Live',              cls: 'text-amber-200 border-amber-300', style: { background: 'rgba(251,191,36,0.2)' } },
  completed:         { label: 'Completed',         cls: 'text-white/50 border-white/20',  style: { background: 'rgba(255,255,255,0.08)' } },
}

// ─── Info accordion ───────────────────────────────────────────────────────────
const INFO_SECTIONS = [
  {
    key: 'about',
    title: 'About Pawn\'s Gambit',
    content: (
      <div className="space-y-4 text-sm leading-relaxed text-white/80">
        <p className="text-base font-semibold text-white">More Than a Tournament</p>
        <p>Every Pawn's Gambit tournament is an opportunity to compete, learn, and become part of something that extends beyond a single day.</p>
        <p>Of course, people come to test themselves. They come for the challenge, the thrill of a well-played game, and the satisfaction of performing under pressure.</p>
        <p>But what keeps players returning isn't just the competition.</p>
        <p>It's seeing familiar faces across the board. Following rivalries that develop over time. Celebrating personal milestones. Watching new players become regulars. Being part of a chess culture that grows stronger with every event.</p>
        <p>Each tournament stands on its own. Together, they create the ongoing life of Pawn's Gambit.</p>
      </div>
    ),
  },
  {
    key: 'rating',
    title: 'What is PG Rating?',
    content: (
      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        <div>
          <p className="text-base font-semibold text-white mb-2">A Rating That Lives Inside Pawn's Gambit</p>
          <p>PG Rating is our own rating system, designed to connect every Pawn's Gambit tournament into a single ongoing record. Every event contributes to your standing, giving players a way to track their presence within the community over time.</p>
        </div>
        <div>
          <p className="text-base font-semibold text-white mb-2">Why PG Rating?</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-2">Because Tournaments Shouldn't Exist In Isolation</p>
          <p>A great game is memorable. A great rivalry is unforgettable.</p>
          <p className="mt-2">PG Rating gives players a reason to follow familiar names, celebrate milestones, and return for the next chapter. It transforms separate tournaments into a living competitive culture that grows with every event.</p>
        </div>
      </div>
    ),
  },
  {
    key: 'rules',
    title: 'Tournament Rules & Etiquette',
    content: (
      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        {[
          { n: '1', title: 'Respect Your Opponent', items: ['Shake hands, fist bump, or greet your opponent before the game.', 'Win with humility and lose with grace.', 'No trash talk, taunting, or unsportsmanlike behavior.'] },
          { n: '2', title: 'Silence During Games', items: ['Keep conversations away from playing tables.', 'Spectators must remain silent.', 'Avoid distracting players in any way.'] },
          { n: '3', title: 'Touch-Move Rule', items: ['If you deliberately touch one of your pieces, you must move it if a legal move exists.', 'If you deliberately touch an opponent\'s piece, you must capture it if legally possible.', 'To adjust pieces on the board, clearly say "Adjust" before touching them.'] },
          { n: '4', title: 'One Hand Rule', items: ['Use only one hand when making a move.', 'The same hand used to move the piece must be used to press the clock.'] },
          { n: '5', title: 'Mobile Phones', items: ['Phones must be on silent mode.', 'No calls, texting, browsing, or analysis during games.', 'Repeated violations may result in penalties.'] },
          { n: '6', title: 'No External Assistance', items: ['No engines, analysis boards, books, notes, or advice from others.', 'Players may not discuss ongoing games with anyone.'] },
          { n: '7', title: 'Spectator Conduct', items: ['Spectators may watch but may not comment on positions, suggest moves, react visibly to blunders or tactics, or interfere with games in any way.'] },
          { n: '8', title: 'Illegal Moves', items: ['An illegal move must be corrected immediately when noticed.', 'Tournament-specific penalties will be announced before the event.', 'Repeated illegal moves may result in loss of the game.'] },
          { n: '9', title: 'Recording Results', items: ['Both players must verify the result before reporting it.', 'Once submitted, results are considered final unless a clear error is found.'] },
          { n: '10', title: 'Respect the Equipment', items: ['Handle boards, pieces, and clocks carefully.', 'Do not slam pieces or clocks.', 'Any intentional damage may result in disqualification.'] },
          { n: '11', title: 'Disputes', items: ['If a dispute arises: pause the clock if necessary, call the arbiter or organizer, and do not argue loudly at the board.', 'The organizer\'s decision is final.'] },
          { n: '12', title: 'Fair Play Above All', items: ['Pawn\'s Gambit exists to bring people together through chess.', 'Play hard. Play fair. Leave every opponent feeling respected.'] },
        ].map(rule => (
          <div key={rule.n}>
            <p className="font-semibold text-white mb-1">{rule.n}. {rule.title}</p>
            <ul className="space-y-1 pl-3">
              {rule.items.map((item, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,102,0,0.8)' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="pt-3 border-t border-white/15">
          <p className="font-semibold text-white mb-2">The PG Code</p>
          <p className="italic mb-2">Come to compete. Stay to connect.</p>
          <ul className="space-y-1 pl-3">
            {['Be kind to beginners.', 'Congratulate good moves.', 'Introduce yourself after the game.', 'Analysis is encouraged after both games have finished.', 'Help make the tournament welcoming for everyone.'].map((item, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,102,0,0.8)' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-white/60 italic text-xs">A good tournament is remembered for more than who won it. It's remembered for the people who made it enjoyable to attend. ♟❤</p>
        </div>
      </div>
    ),
  },
  {
    key: 'benefits',
    title: 'What do you get from each tournament?',
    content: (
      <div className="text-sm leading-relaxed text-white/80">
        <p className="mb-4">Every tournament is something to look forward to.</p>
        <ol className="space-y-2.5">
          {[
            'A day of casual, competitive chess.',
            'A complimentary beverage.',
            'Access to a pre-event workshop designed to help you prepare, learn, and get more out of the tournament.',
            'A tactics practice PDF you can continue using long after the event ends.',
            'A PG Rating that carries your participation into future Pawn\'s Gambit tournaments.',
            'The chance to win trophies, prize money, and one of three premium chess boards through our lucky draw.',
            'New ideas from players who think differently than you.',
            'A few memorable games.',
            'And perhaps a reason to come back next month.',
            'Every tournament offers a chance to compete. We aim to offer something worth looking forward to.',
          ].map((item, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5" style={{ background: 'rgba(255,102,0,0.15)', border: '1px solid rgba(255,102,0,0.35)', color: '#FF8C42' }}>
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
]

function InfoAccordions() {
  const [open, setOpen] = useState(null)
  const tog = (key) => setOpen(prev => prev === key ? null : key)

  return (
    <div className="mb-8">
      {/* Buttons — 2×2 grid on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        {INFO_SECTIONS.map(sec => (
          <button
            key={sec.key}
            onClick={() => tog(sec.key)}
            className="flex items-center justify-between gap-3 px-6 py-5 rounded-2xl text-left border transition-all text-base font-semibold text-white"
            style={{
              background: open === sec.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ fontFamily: "'Times New Roman', Times, serif" }}>{sec.title}</span>
            <ChevronDown
              size={15}
              className="flex-shrink-0 transition-transform duration-300"
              style={{
                transform: open === sec.key ? 'rotate(180deg)' : 'rotate(0deg)',
                color: open === sec.key ? 'rgba(255,255,255,0.7)' : '#94a3b8',
              }}
            />
          </button>
        ))}
      </div>

      {/* Shared content panel — opens below all 3 buttons */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? '4000px' : '0px',
          transition: 'max-height 420ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
          {INFO_SECTIONS.map(sec => (
            <div key={sec.key} style={{ display: open === sec.key ? 'block' : 'none' }}>
              {sec.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Tournaments() {
  const [activeTab, setActiveTab]     = useState('upcoming')
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const tab = TABS.find(t => t.key === activeTab)
    fetchTournaments(tab.statuses)
  }, [activeTab])

  async function fetchTournaments(statuses) {
    setLoading(true)
    const { data } = await supabase
      .from('tournaments')
      .select('*, tournament_registrations(count)')
      .in('status', statuses)
      .order('date', { ascending: activeTab !== 'past' })
    setTournaments(
      (data || []).map(t => ({
        ...t,
        registered_count: t.tournament_registrations?.[0]?.count ?? 0,
      }))
    )
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen pt-20 pb-16 px-4" style={{ background: 'transparent' }}>
      <img src="/PCA.png" alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }} />
      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Header */}
        <div className="py-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Tournaments</h1>
          <p className="mt-2 text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>Compete, earn PG ratings, and be part of something bigger.</p>
        </div>

        {/* Info accordions */}
        <InfoAccordions />

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1 mb-6 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 min-w-max text-white"
              style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'transparent',
                fontWeight: activeTab === tab.key ? 700 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="h-5 rounded w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="space-y-3">
            {tournaments.map(t => <TournamentRow key={t.id} tournament={t} />)}
          </div>
        ) : (
          <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <Trophy size={52} className="mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium text-white">No {activeTab} tournaments</p>
            <p className="text-sm mt-2">
              {activeTab === 'upcoming' ? 'Check back soon for upcoming events!'
                : activeTab === 'ongoing' ? 'No tournaments are currently in progress.'
                : 'No past tournaments to display.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tournament row (list item) ───────────────────────────────────────────────
function TournamentRow({ tournament }) {
  const {
    id, name, date, format, venue, is_online,
    entry_fee, prize_pool, registered_count = 0, max_players, status,
  } = tournament

  const meta = STATUS_META[status] || STATUS_META.upcoming

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—'

  const isOpen      = status === 'registration_open'
  const isCompleted = status === 'completed'

  const spots = max_players != null ? max_players - registered_count : null

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
      <div className="flex items-stretch gap-0">

        {/* Left accent bar */}
        <div className="w-1 flex-shrink-0" style={{
          background: isOpen ? '#4ade80' : status === 'ongoing' ? '#fbbf24' : isCompleted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)'
        }} />

        {/* Main content */}
        <div className="flex-1 px-5 py-4 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.cls}`} style={meta.style}>
                  {meta.label}
                </span>
                <h3 className="font-semibold text-white text-base leading-snug">{name}</h3>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {is_online ? 'Online' : venue || 'TBD'}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy size={11} />
                  {format}
                </span>
                <span className="flex items-center gap-1">
                  {entry_fee ? `₹${entry_fee.toLocaleString('en-IN')} entry` : 'Free'}
                  {prize_pool && Number(prize_pool) > 0 ? ` · ₹${Number(prize_pool).toLocaleString('en-IN')} pool` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {registered_count}{max_players != null ? `/${max_players}` : ''} players
                  {spots != null && spots <= 10 && spots > 0 && (
                    <span className="text-amber-300 font-medium">· {spots} spots left</span>
                  )}
                </span>
              </div>
            </div>

            {/* Action button */}
            <div className="flex-shrink-0">
              {isOpen ? (
                <Link
                  to={`/tournaments/${id}/register`}
                  className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #FF4500, #FF9900)' }}
                >
                  Register <ChevronRight size={14} />
                </Link>
              ) : isCompleted ? (
                <Link
                  to={`/tournaments/${id}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}
                >
                  Results <ChevronRight size={14} />
                </Link>
              ) : (
                <Link
                  to={`/tournaments/${id}`}
                  className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}
                >
                  Details <ChevronRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

