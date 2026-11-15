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

function GoldenRetriever({ mood }) {
  return (
    <>
      <defs>
        <linearGradient id="gr-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8d48a" />
          <stop offset="1" stopColor="#e0a24a" />
        </linearGradient>
      </defs>
      {/* head */}
      <rect x="22" y="26" width="76" height="82" rx="38" fill="url(#gr-body)" />
      {/* soft fluffy top */}
      <circle cx="50" cy="30" r="9" fill="#f8d48a" /><circle cx="62" cy="27" r="9" fill="#f8d48a" /><circle cx="73" cy="31" r="8" fill="#f8d48a" />
      {/* floppy ears */}
      <path d="M30 36 C12 40 8 70 16 86 C22 94 32 88 34 76 C36 62 38 46 30 36 Z" fill="#c9862f" />
      <path d="M90 36 C108 40 112 70 104 86 C98 94 88 88 86 76 C84 62 82 46 90 36 Z" fill="#c9862f" />
      {/* cream muzzle */}
      <ellipse cx="60" cy="82" rx="19" ry="15" fill="#fde9c4" />
      <ellipse cx="38" cy="78" rx="6.5" ry="4" fill="#ff8f8f" opacity="0.35" />
      <ellipse cx="82" cy="78" rx="6.5" ry="4" fill="#ff8f8f" opacity="0.35" />
      <Eyes mood={mood} y={58} gap={15} />
      <path d="M53 71 h14 a4 4 0 0 1 -3 6 l-4 3 l-4 -3 a4 4 0 0 1 -3 -6 z" fill="#2b2b30" />
      <Mouth mood={mood} y={88} />
      {mood === 'happy' && <ellipse cx="60" cy="96" rx="5" ry="6" fill="#ff7d93" />}
    </>
  )
}

// kind: 'cloud' (the Fart Monster shape) or 'dog' (the Sewer Butt golden retriever)
export const CHARACTERS = [
  { id: 'cloud', label: 'Cloud monster' },
  { id: 'dog', label: 'Golden retriever' },
]

export default function Character({ kind, mood = 'happy', size = 64, className = '' }) {
  return (
    <svg className={`character ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {kind === 'dog' || kind === 'roo' || kind === 'rat' ? <GoldenRetriever mood={mood} /> : <FartMonster mood={mood} />}
    </svg>
  )
}
