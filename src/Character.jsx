// Two original mascots. Their face follows how the day is going.
// mood: 'happy' | 'ok' | 'worried' | 'sleepy'

export function moodFor(budget, spent) {
  if (budget == null) return 'sleepy'
  const left = budget - spent
  if (left < 0) return 'worried'
  if (left / budget < 0.15) return 'ok'
  return 'happy'
}

function Eyes({ mood, y = 56, gap = 15, cx = 60 }) {
  if (mood === 'sleepy') {
    return (
      <g stroke="#2b2b30" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d={`M${cx - gap - 6} ${y} q6 5 12 0`} />
        <path d={`M${cx + gap - 6} ${y} q6 5 12 0`} />
      </g>
    )
  }
  const r = mood === 'worried' ? 8.5 : 8
  const py = mood === 'worried' ? y - 1 : y + 1
  return (
    <g>
      {[cx - gap, cx + gap].map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill="#fff" />
          <circle cx={x + 1} cy={py} r="4.2" fill="#2b2b30" />
          <circle cx={x + 2.5} cy={py - 1.8} r="1.4" fill="#fff" />
        </g>
      ))}
      {mood === 'worried' && (
        <g stroke="#2b2b30" strokeWidth="2.6" strokeLinecap="round">
          <path d={`M${cx - gap - 7} ${y - 13} l9 3`} />
          <path d={`M${cx + gap + 7} ${y - 13} l-9 3`} />
        </g>
      )}
    </g>
  )
}

function Mouth({ mood, y = 76, cx = 60 }) {
  const s = { stroke: '#2b2b30', strokeWidth: 3, strokeLinecap: 'round', fill: 'none' }
  if (mood === 'happy') return <path d={`M${cx - 10} ${y - 2} q10 11 20 0`} {...s} fill="#2b2b30" />
  if (mood === 'ok') return <path d={`M${cx - 7} ${y} h14`} {...s} />
  if (mood === 'worried') return <ellipse cx={cx} cy={y + 1} rx="5" ry="6" fill="#2b2b30" />
  return <path d={`M${cx - 5} ${y} q5 3 10 0`} {...s} />
}

function FartMonster({ mood }) {
  return (
    <>
      <defs>
        <linearGradient id="fm-body" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {/* little puff trailing behind — he can't help it */}
      {mood !== 'sleepy' && (
        <g style={{ fill: 'var(--accent-2)' }} opacity="0.55">
          <circle cx="104" cy="96" r="7" />
          <circle cx="112" cy="86" r="5" />
          <circle cx="114" cy="104" r="4" />
        </g>
      )}
      {/* cloud-puff body */}
      <g fill="url(#fm-body)">
        <circle cx="38" cy="40" r="17" />
        <circle cx="60" cy="31" r="20" />
        <circle cx="82" cy="40" r="17" />
        <rect x="18" y="38" width="84" height="66" rx="33" />
      </g>
      <ellipse cx="38" cy="78" rx="7" ry="4.5" fill="#ff9fb0" opacity="0.6" />
      <ellipse cx="82" cy="78" rx="7" ry="4.5" fill="#ff9fb0" opacity="0.6" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      <g style={{ fill: 'var(--accent)' }}>
        <rect x="36" y="98" width="12" height="12" rx="6" />
        <rect x="72" y="98" width="12" height="12" rx="6" />
      </g>
    </>
  )
}

function SewerButt({ mood }) {
  return (
    <>
      <defs>
        <linearGradient id="sb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {/* tail */}
      <path d="M96 92 q20 4 16 -14 q-3 -10 -10 -4" fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="5" strokeLinecap="round" />
      {/* ears */}
      <circle cx="32" cy="32" r="16" style={{ fill: 'var(--accent)' }} />
      <circle cx="88" cy="32" r="16" style={{ fill: 'var(--accent)' }} />
      <circle cx="32" cy="32" r="9" fill="#fff" opacity="0.55" />
      <circle cx="88" cy="32" r="9" fill="#fff" opacity="0.55" />
      {/* body */}
      <rect x="18" y="30" width="84" height="80" rx="40" fill="url(#sb-body)" />
      <ellipse cx="36" cy="80" rx="7" ry="4.5" fill="#ff6f91" opacity="0.35" />
      <ellipse cx="84" cy="80" rx="7" ry="4.5" fill="#ff6f91" opacity="0.35" />
      <Eyes mood={mood} y={60} gap={16} />
      {/* nose + whiskers */}
      <ellipse cx="60" cy="72" rx="5" ry="3.6" fill="#2b2b30" opacity="0.75" />
      <g stroke="#2b2b30" strokeWidth="1.6" strokeLinecap="round" opacity="0.35">
        <path d="M44 74 l-14 -3" />
        <path d="M44 78 l-14 2" />
        <path d="M76 74 l14 -3" />
        <path d="M76 78 l14 2" />
      </g>
      <Mouth mood={mood} y={86} />
    </>
  )
}

// kind: 'cloud' (the Fart Monster shape) or 'rat' (the Sewer Butt shape)
export const CHARACTERS = [
  { id: 'cloud', label: 'Cloud monster' },
  { id: 'rat', label: 'Little rat' },
]

export default function Character({ kind, mood = 'happy', size = 64, className = '' }) {
  return (
    <svg className={`character ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {kind === 'rat' ? <SewerButt mood={mood} /> : <FartMonster mood={mood} />}
    </svg>
  )
}
