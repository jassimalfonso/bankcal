// Hand-drawn expressive avatars. Every face reacts to the day:
// happy (on track) · ok (nearly out) · over (over budget) · sleep (no budget yet).
// Without a mood they show a calm, neutral smile (used in pickers).

export const AVATARS = [
  ['koala', 'Koala'], ['panda', 'Panda'], ['bunny', 'Bunny'], ['cat', 'Cat'],
  ['frog', 'Frog'], ['bear', 'Bear'], ['mouse', 'Mouse'], ['cloud', 'Cloud monster'],
].map(([id, label]) => ({ id, label }))

// Older ids from earlier versions → closest new face.
const LEGACY = { poo: 'cloud', rat: 'mouse', pig: 'bear', hamster: 'mouse', dog: 'bear', fox: 'cat', monkey: 'bear', ghost: 'cloud', alien: 'cloud', octopus: 'cloud', chick: 'frog', unicorn: 'bunny', penguin: 'panda' }

export function moodFor(budget, spent) {
  if (budget == null) return 'sleep'
  const left = budget - spent
  if (left < 0) return 'over'
  if (left / budget < 0.15) return 'ok'
  return 'happy'
}

const INK = '#2b2b30'

function Eye({ x, y, r, mood, white = '#fff', lid = INK }) {
  if (mood === 'happy') return <path d={`M${x - r} ${y + 2} q${r} ${-r * 1.4} ${r * 2} 0`} stroke={lid} strokeWidth="3.4" strokeLinecap="round" fill="none" />
  if (mood === 'sleep') return <path d={`M${x - r} ${y - 1} q${r} ${r * 1.1} ${r * 2} 0`} stroke={lid} strokeWidth="3.2" strokeLinecap="round" fill="none" />
  const big = mood === 'over' ? 1.18 : 1
  const pr = mood === 'over' ? r * 0.42 : r * 0.58
  const dx = mood === 'ok' ? r * 0.32 : 0.6
  return (
    <g>
      <circle cx={x} cy={y} r={r * big} fill={white} />
      <circle cx={x + dx} cy={y + 0.8} r={pr} fill={INK} />
      <circle cx={x + dx + pr * 0.45} cy={y + 0.8 - pr * 0.5} r={pr * 0.38} fill="#fff" />
    </g>
  )
}

function Face({ mood = 'neutral', lx, rx, y, my, r = 7.5, cheekY, cheekDx = 4, blush = '#ff8fa3', patches, white, lid }) {
  const cx = (lx + rx) / 2
  const blushOp = mood === 'happy' ? 0.65 : mood === 'over' ? 0.15 : 0.35
  return (
    <g>
      {patches}
      <ellipse cx={lx - cheekDx} cy={cheekY ?? my - 4} rx="7" ry="4.2" fill={blush} opacity={blushOp} />
      <ellipse cx={rx + cheekDx} cy={cheekY ?? my - 4} rx="7" ry="4.2" fill={blush} opacity={blushOp} />
      <Eye x={lx} y={y} r={r} mood={mood} white={white} lid={lid} />
      <Eye x={rx} y={y} r={r} mood={mood} white={white} lid={lid} />
      {mood === 'over' && (
        <g stroke={INK} strokeWidth="2.8" strokeLinecap="round">
          <path d={`M${lx - r - 1} ${y - r - 3} L${lx + r - 1} ${y - r - 8}`} />
          <path d={`M${rx + r + 1} ${y - r - 3} L${rx - r + 1} ${y - r - 8}`} />
        </g>
      )}
      {mood === 'happy' && (
        <g>
          <path d={`M${cx - 9} ${my - 1} q9 13 18 0 z`} fill={INK} />
          <ellipse cx={cx} cy={my + 5} rx="4.5" ry="2.6" fill="#ff7d93" />
        </g>
      )}
      {mood === 'neutral' && <path d={`M${cx - 6} ${my} q6 5 12 0`} stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />}
      {mood === 'ok' && <path d={`M${cx - 8} ${my + 1} q4 -3.5 8 0 t8 0`} stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />}
      {mood === 'over' && <ellipse cx={cx} cy={my + 2} rx="5.2" ry="6.6" fill={INK} />}
      {mood === 'sleep' && <ellipse cx={cx} cy={my + 1} rx="3" ry="2.4" fill={INK} />}
      {(mood === 'ok' || mood === 'over') && <Drop x={rx + r + 9} y={y - r - 2} />}
      {mood === 'over' && <Drop x={lx - r - 9} y={y - r + 2} small />}
      {mood === 'sleep' && (
        <g fill="#8e8ea6" fontFamily="system-ui, sans-serif" fontWeight="900">
          <text x="92" y="22" fontSize="16">z</text>
          <text x="102" y="12" fontSize="11">z</text>
        </g>
      )}
    </g>
  )
}

function Drop({ x, y, small }) {
  const s = small ? 0.75 : 1
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 C4 -2 6 1 6 4 a6 6 0 0 1 -12 0 c0 -3 2 -6 6 -12z" fill="#8fd3ff" stroke="#5ab8ef" strokeWidth="1" />
}

function Grad({ id, a, b }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  )
}

const SPECIES = {
  koala: (m) => (
    <>
      <defs><Grad id="g-koala" a="#c9ced8" b="#9aa1ae" /></defs>
      <circle cx="22" cy="40" r="20" fill="#9aa1ae" /><circle cx="98" cy="40" r="20" fill="#9aa1ae" />
      <circle cx="24" cy="42" r="12" fill="#eef0f4" /><circle cx="96" cy="42" r="12" fill="#eef0f4" />
      <ellipse cx="60" cy="66" rx="42" ry="40" fill="url(#g-koala)" />
      <Face mood={m} lx={42} rx={78} y={58} my={93} cheekY={80} cheekDx={2} />
      <ellipse cx="60" cy="74" rx="10" ry="12" fill="#4a4a58" />
      <ellipse cx="57" cy="69" rx="3" ry="4" fill="#fff" opacity="0.25" />
    </>
  ),
  panda: (m) => (
    <>
      <defs><Grad id="g-panda" a="#ffffff" b="#e6e6ef" /></defs>
      <circle cx="28" cy="30" r="15" fill="#3a3a46" /><circle cx="92" cy="30" r="15" fill="#3a3a46" />
      <ellipse cx="60" cy="66" rx="44" ry="40" fill="url(#g-panda)" />
      <Face mood={m} lx={43} rx={77} y={60} my={86} cheekY={80} cheekDx={6} white="#fff" lid="#fff"
        patches={<g fill="#3a3a46"><ellipse cx="42" cy="61" rx="12" ry="14" transform="rotate(25 42 61)" /><ellipse cx="78" cy="61" rx="12" ry="14" transform="rotate(-25 78 61)" /></g>} />
      <ellipse cx="60" cy="76" rx="5.5" ry="4" fill="#3a3a46" />
    </>
  ),
  bunny: (m) => (
    <>
      <defs><Grad id="g-bunny" a="#ffffff" b="#ece7f2" /></defs>
      <ellipse cx="40" cy="26" rx="11" ry="27" fill="#ece7f2" transform="rotate(-10 40 26)" />
      <ellipse cx="80" cy="26" rx="11" ry="27" fill="#ece7f2" transform="rotate(10 80 26)" />
      <ellipse cx="40" cy="28" rx="5.5" ry="19" fill="#ffc2d1" transform="rotate(-10 40 28)" />
      <ellipse cx="80" cy="28" rx="5.5" ry="19" fill="#ffc2d1" transform="rotate(10 80 28)" />
      <ellipse cx="60" cy="74" rx="42" ry="36" fill="url(#g-bunny)" />
      <Face mood={m} lx={44} rx={76} y={70} my={93} cheekY={86} />
      <path d="M56 82 h8 l-4 4 z" fill="#ff8fa8" />
    </>
  ),
  cat: (m) => (
    <>
      <defs><Grad id="g-cat" a="#ffcf7a" b="#f6a33c" /></defs>
      <path d="M20 54 L26 14 L52 34 Z" fill="#f6a33c" /><path d="M100 54 L94 14 L68 34 Z" fill="#f6a33c" />
      <path d="M27 42 L30 22 L44 34 Z" fill="#ffc2d1" /><path d="M93 42 L90 22 L76 34 Z" fill="#ffc2d1" />
      <ellipse cx="60" cy="68" rx="44" ry="38" fill="url(#g-cat)" />
      <path d="M50 34 q10 6 20 0" stroke="#e08a24" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Face mood={m} lx={42} rx={78} y={64} my={90} cheekY={82} />
      <path d="M56 79 h8 l-4 4 z" fill="#ff7d93" />
      <g stroke="#7a5a3a" strokeWidth="1.6" strokeLinecap="round" opacity="0.45">
        <path d="M24 78 l-14 -3" /><path d="M24 84 l-14 2" /><path d="M96 78 l14 -3" /><path d="M96 84 l14 2" />
      </g>
    </>
  ),
  frog: (m) => (
    <>
      <defs><Grad id="g-frog" a="#9be38a" b="#4fbf5e" /></defs>
      <circle cx="36" cy="38" r="20" fill="#7fd473" /><circle cx="84" cy="38" r="20" fill="#7fd473" />
      <ellipse cx="60" cy="74" rx="48" ry="34" fill="url(#g-frog)" />
      <Face mood={m} lx={36} rx={84} y={38} my={86} r={10} cheekY={80} cheekDx={-2} />
      <circle cx="54" cy="66" r="1.8" fill="#2f7d3c" /><circle cx="66" cy="66" r="1.8" fill="#2f7d3c" />
    </>
  ),
  bear: (m) => (
    <>
      <defs><Grad id="g-bear" a="#c48a5a" b="#94603a" /></defs>
      <circle cx="26" cy="32" r="15" fill="#94603a" /><circle cx="94" cy="32" r="15" fill="#94603a" />
      <circle cx="26" cy="32" r="8" fill="#e7b98f" /><circle cx="94" cy="32" r="8" fill="#e7b98f" />
      <ellipse cx="60" cy="66" rx="44" ry="40" fill="url(#g-bear)" />
      <ellipse cx="60" cy="86" rx="20" ry="15" fill="#e7c49e" />
      <Face mood={m} lx={42} rx={78} y={58} my={91} cheekY={78} cheekDx={4} />
      <ellipse cx="60" cy="79" rx="6" ry="4.5" fill="#3a2a22" />
    </>
  ),
  mouse: (m) => (
    <>
      <defs><Grad id="g-mouse" a="#dcd8ee" b="#b5afcf" /></defs>
      <circle cx="26" cy="36" r="22" fill="#b5afcf" /><circle cx="94" cy="36" r="22" fill="#b5afcf" />
      <circle cx="26" cy="37" r="14" fill="#ffc2d1" /><circle cx="94" cy="37" r="14" fill="#ffc2d1" />
      <ellipse cx="60" cy="72" rx="40" ry="36" fill="url(#g-mouse)" />
      <Face mood={m} lx={45} rx={75} y={66} my={93} r={7} cheekY={84} cheekDx={6} />
      <ellipse cx="60" cy="81" rx="5" ry="3.8" fill="#ff8fa8" />
      <g stroke="#6d6880" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <path d="M30 84 l-16 -3" /><path d="M30 89 l-16 2" /><path d="M90 84 l16 -3" /><path d="M90 89 l16 2" />
      </g>
    </>
  ),
  cloud: (m) => (
    <>
      <defs><Grad id="g-cloud" a="#a6e3a1" b="#5fbf72" /></defs>
      <g fill="url(#g-cloud)">
        <circle cx="36" cy="44" r="19" /><circle cx="60" cy="33" r="22" /><circle cx="84" cy="44" r="19" />
        <rect x="16" y="42" width="88" height="64" rx="32" />
      </g>
      <Face mood={m} lx={44} rx={76} y={64} my={88} />
    </>
  ),
}

export default function Avatar({ id, mood, size = 64, className = '' }) {
  const kind = SPECIES[id] ? id : SPECIES[LEGACY[id]] ? LEGACY[id] : 'koala'
  return (
    <span className={`avatar-pic mood-${mood ?? 'neutral'} ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">{SPECIES[kind](mood ?? 'neutral')}</svg>
    </span>
  )
}
