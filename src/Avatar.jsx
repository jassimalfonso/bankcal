// Geometric avatars, built only from circles, half-circles, squares and lines,
// in the app's material palette. The face follows the day:
// happy (on track) · ok (nearly out) · over (over budget) · sleep (no budget yet).

export const AVATARS = [
  ['koala', 'Koala'], ['panda', 'Panda'], ['bunny', 'Bunny'], ['cat', 'Cat'],
  ['frog', 'Frog'], ['bear', 'Bear'], ['mouse', 'Mouse'], ['cloud', 'Cloud monster'],
].map(([id, label]) => ({ id, label }))

const LEGACY = { poo: 'cloud', rat: 'mouse', pig: 'bear', hamster: 'mouse', dog: 'bear', fox: 'cat', monkey: 'bear', ghost: 'cloud', alien: 'cloud', octopus: 'cloud', chick: 'frog', unicorn: 'bunny', penguin: 'panda' }

export function moodFor(budget, spent) {
  if (budget == null) return 'sleep'
  const left = budget - spent
  if (left < 0) return 'over'
  if (left / budget < 0.15) return 'ok'
  return 'happy'
}

// materials
const C = {
  ink: '#252523', plaster: '#f4f1ec', linen: '#d8cfc0', travertine: '#cdbfa6', stone: '#a9a49b',
  pebble: '#bdb7ad', bronze: '#b78a5c', walnut: '#6b4a33', green: '#2f3d34', sage: '#8fa594', clay: '#c48466', steel: '#7f95a8',
}

function Eye({ x, y, mood, ink }) {
  if (mood === 'happy') return <path d={`M${x - 6} ${y + 2} a6 6 0 0 1 12 0`} stroke={ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />
  if (mood === 'sleep') return <path d={`M${x - 6} ${y} h12`} stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
  if (mood === 'over') return <g><circle cx={x} cy={y} r="6.5" fill="none" stroke={ink} strokeWidth="2.6" /><circle cx={x} cy={y} r="2" fill={ink} /></g>
  return <circle cx={x + (mood === 'ok' ? 2.5 : 0)} cy={y} r="4.6" fill={ink} />
}

// eyeInk: colour for the eyes (light on dark patches); ink: colour for the mouth
function Face({ mood = 'neutral', lx, rx, y, my, ink = C.ink, eyeInk, cheek = C.clay, cheekY }) {
  const cx = (lx + rx) / 2
  const cy = cheekY ?? my - 5
  const e = eyeInk ?? ink
  return (
    <g>
      {mood !== 'over' && <><circle cx={lx - 6} cy={cy} r="5" fill={cheek} opacity="0.4" /><circle cx={rx + 6} cy={cy} r="5" fill={cheek} opacity="0.4" /></>}
      <Eye x={lx} y={y} mood={mood} ink={e} />
      <Eye x={rx} y={y} mood={mood} ink={e} />
      {mood === 'over' && <g stroke={ink} strokeWidth="2.8" strokeLinecap="round"><path d={`M${lx - 8} ${y - 14} l12 -4`} /><path d={`M${rx + 8} ${y - 14} l-12 -4`} /></g>}
      {mood === 'happy' && <path d={`M${cx - 8} ${my - 2} a8 8 0 0 0 16 0 z`} fill={ink} />}
      {mood === 'neutral' && <path d={`M${cx - 5} ${my} a5 5 0 0 0 10 0`} stroke={ink} strokeWidth="2.8" strokeLinecap="round" fill="none" />}
      {mood === 'ok' && <path d={`M${cx - 6} ${my + 2} l12 -3`} stroke={ink} strokeWidth="2.8" strokeLinecap="round" />}
      {mood === 'over' && <circle cx={cx} cy={my + 1} r="5" fill={ink} />}
      {mood === 'sleep' && <circle cx={cx} cy={my} r="2.4" fill={ink} />}
      {(mood === 'ok' || mood === 'over') && <circle cx={rx + 15} cy={y - 14} r="3.6" fill={C.steel} />}
      {mood === 'over' && <circle cx={lx - 15} cy={y - 10} r="2.8" fill={C.steel} />}
      {mood === 'sleep' && (
        <g fill={C.stone}>
          <rect x="96" y="14" width="9" height="9" />
          <rect x="108" y="4" width="6" height="6" />
        </g>
      )}
    </g>
  )
}

const SPECIES = {
  koala: (m) => (
    <>
      <circle cx="24" cy="42" r="20" fill={C.stone} /><circle cx="96" cy="42" r="20" fill={C.stone} />
      <circle cx="24" cy="42" r="11" fill={C.linen} /><circle cx="96" cy="42" r="11" fill={C.linen} />
      <circle cx="60" cy="68" r="40" fill={C.pebble} />
      <Face mood={m} lx={43} rx={77} y={60} my={96} cheekY={84} />
      <rect x="51" y="64" width="18" height="24" rx="9" fill={C.ink} />
    </>
  ),
  panda: (m) => (
    <>
      <circle cx="28" cy="32" r="15" fill={C.ink} /><circle cx="92" cy="32" r="15" fill={C.ink} />
      <circle cx="60" cy="66" r="42" fill={C.plaster} stroke={C.linen} strokeWidth="2" />
      <circle cx="43" cy="61" r="12" fill={C.ink} /><circle cx="77" cy="61" r="12" fill={C.ink} />
      <Face mood={m} lx={43} rx={77} y={61} my={89} eyeInk={C.plaster} cheekY={83} />
      <rect x="55" y="74" width="10" height="7" rx="3.5" fill={C.ink} />
    </>
  ),
  bunny: (m) => (
    <>
      <rect x="32" y="2" width="18" height="50" rx="9" fill={C.linen} /><rect x="70" y="2" width="18" height="50" rx="9" fill={C.linen} />
      <rect x="37" y="9" width="8" height="38" rx="4" fill={C.clay} opacity="0.55" /><rect x="75" y="9" width="8" height="38" rx="4" fill={C.clay} opacity="0.55" />
      <circle cx="60" cy="74" r="38" fill={C.plaster} stroke={C.linen} strokeWidth="2" />
      <Face mood={m} lx={45} rx={75} y={70} my={95} cheekY={87} />
      <path d="M55 81 h10 l-5 5 z" fill={C.clay} />
    </>
  ),
  cat: (m) => (
    <>
      <path d="M20 58 L24 12 L58 34 Z" fill={C.bronze} /><path d="M100 58 L96 12 L62 34 Z" fill={C.bronze} />
      <circle cx="60" cy="68" r="42" fill={C.bronze} />
      <Face mood={m} lx={42} rx={78} y={64} my={93} cheekY={84} />
      <path d="M55 79 h10 l-5 5 z" fill={C.ink} />
      <g stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.5">
        <path d="M22 80 h-14" /><path d="M22 87 h-14" /><path d="M98 80 h14" /><path d="M98 87 h14" />
      </g>
    </>
  ),
  frog: (m) => (
    <>
      <circle cx="36" cy="40" r="20" fill={C.sage} /><circle cx="84" cy="40" r="20" fill={C.sage} />
      <circle cx="36" cy="40" r="12" fill={C.plaster} /><circle cx="84" cy="40" r="12" fill={C.plaster} />
      <path d="M12 76 a48 34 0 0 1 96 0 v4 a48 30 0 0 1 -96 0 z" fill={C.sage} />
      <Face mood={m} lx={36} rx={84} y={40} my={90} cheekY={84} />
    </>
  ),
  bear: (m) => (
    <>
      <circle cx="26" cy="32" r="15" fill={C.walnut} /><circle cx="94" cy="32" r="15" fill={C.walnut} />
      <circle cx="26" cy="32" r="7" fill={C.travertine} /><circle cx="94" cy="32" r="7" fill={C.travertine} />
      <circle cx="60" cy="66" r="42" fill={C.walnut} />
      <circle cx="60" cy="86" r="18" fill={C.travertine} />
      <Face mood={m} lx={42} rx={78} y={58} my={95} eyeInk={C.plaster} cheekY={70} />
      <rect x="53" y="75" width="14" height="9" rx="4.5" fill={C.ink} />
    </>
  ),
  mouse: (m) => (
    <>
      <circle cx="26" cy="38" r="22" fill={C.stone} /><circle cx="94" cy="38" r="22" fill={C.stone} />
      <circle cx="26" cy="38" r="13" fill={C.clay} opacity="0.55" /><circle cx="94" cy="38" r="13" fill={C.clay} opacity="0.55" />
      <circle cx="60" cy="72" r="38" fill={C.pebble} />
      <Face mood={m} lx={46} rx={74} y={67} my={96} cheekY={88} />
      <circle cx="60" cy="82" r="4.5" fill={C.clay} />
      <g stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <path d="M30 86 h-16" /><path d="M30 92 h-16" /><path d="M90 86 h16" /><path d="M90 92 h16" />
      </g>
    </>
  ),
  cloud: (m) => (
    <>
      <g fill={C.green}>
        <circle cx="36" cy="46" r="19" /><circle cx="60" cy="34" r="22" /><circle cx="84" cy="46" r="19" />
        <rect x="16" y="44" width="88" height="62" rx="31" />
      </g>
      <Face mood={m} lx={45} rx={75} y={66} my={90} ink={C.plaster} />
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
