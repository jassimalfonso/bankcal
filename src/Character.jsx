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

function Kangaroo({ mood }) {
  return (
    <>
      <defs>
        <linearGradient id="kg-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--accent-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
        </linearGradient>
      </defs>
      {/* pointed ears, angled out */}
      <path d="M44 42 C26 34 18 14 24 4 C36 6 46 22 50 38 Z" style={{ fill: 'var(--accent)' }} />
      <path d="M76 42 C94 34 102 14 96 4 C84 6 74 22 70 38 Z" style={{ fill: 'var(--accent)' }} />
      <path d="M42 36 C32 30 27 18 29 11 C36 13 42 24 45 34 Z" fill="#fff" opacity="0.5" />
      <path d="M78 36 C88 30 93 18 91 11 C84 13 78 24 75 34 Z" fill="#fff" opacity="0.5" />
      {/* body */}
      <rect x="20" y="34" width="80" height="76" rx="38" fill="url(#kg-body)" />
      {/* long light muzzle */}
      <ellipse cx="60" cy="80" rx="17" ry="15" fill="#fff" opacity="0.45" />
      <ellipse cx="36" cy="80" rx="7" ry="4.5" fill="#ff6f91" opacity="0.35" />
      <ellipse cx="84" cy="80" rx="7" ry="4.5" fill="#ff6f91" opacity="0.35" />
      <Eyes mood={mood} y={60} gap={16} />
      <ellipse cx="60" cy="73" rx="5.5" ry="3.8" fill="#2b2b30" opacity="0.8" />
      <Mouth mood={mood} y={86} />
      {/* pouch with a joey peeking out */}
      <g>
        <ellipse cx="54" cy="96" rx="3" ry="6" transform="rotate(-15 54 96)" style={{ fill: 'var(--accent)' }} />
        <ellipse cx="66" cy="96" rx="3" ry="6" transform="rotate(15 66 96)" style={{ fill: 'var(--accent)' }} />
        <circle cx="60" cy="103" r="8" style={{ fill: 'var(--accent-2)' }} />
        <circle cx="57" cy="102" r="1.5" fill="#2b2b30" /><circle cx="63" cy="102" r="1.5" fill="#2b2b30" />
        <ellipse cx="60" cy="105.5" rx="1.8" ry="1.2" fill="#2b2b30" opacity="0.7" />
        <path d="M42 104 q18 10 36 0 v6 h-36 z" style={{ fill: 'var(--accent)' }} />
        <path d="M42 104 q18 10 36 0" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      </g>
    </>
  )
}

// kind: 'cloud' (the Fart Monster shape) or 'roo' (the Sewer Butt kangaroo)
export const CHARACTERS = [
  { id: 'cloud', label: 'Cloud monster' },
  { id: 'roo', label: 'Kangaroo' },
]

export default function Character({ kind, mood = 'happy', size = 64, className = '' }) {
  return (
    <svg className={`character ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {kind === 'roo' || kind === 'rat' ? <Kangaroo mood={mood} /> : <FartMonster mood={mood} />}
    </svg>
  )
}
