// Buddies: soft, expressive mascots whose face follows the day.
// mood: 'happy' | 'ok' | 'worried' | 'sleepy'
import { BUDDIES, Buddy } from './buddies'

export function moodFor(budget, spent) {
  if (budget == null) return 'sleepy'
  const left = budget - spent
  if (left < 0) return 'worried'
  if (left / budget < 0.15) return 'ok'
  return 'happy'
}

// Fart Monster = fried egg, Sewer Butt = avocado; everyone else picks any.
const ORDER = ['egg', 'avocado', 'mochi', 'onigiri', 'dumpling', 'sushi', 'boba', 'coffee', 'donut', 'cupcake', 'toast', 'strawberry', 'broccoli', 'dino', 'panda', 'penguin', 'ghost', 'bean', 'cloud', 'blobcat']
export const CHARACTERS = ORDER.map((id) => ({ id, label: BUDDIES[id].label }))

// ids used by earlier versions
const LEGACY = { koala: 'egg', husky: 'egg', poo: 'egg', dog: 'avocado', rat: 'avocado', roo: 'avocado', mouse: 'avocado', panda: 'mochi' }

// Little things your buddy earns with your best-ever streak. Never taken away.
export const ACCESSORIES = [
  { id: 'bow', e: '🎀', label: 'a bow', at: 3 },
  { id: 'cap', e: '🧢', label: 'a cap', at: 7 },
  { id: 'flowers', e: '🌸', label: 'a flower', at: 14 },
  { id: 'tophat', e: '🎩', label: 'a top hat', at: 21 },
  { id: 'crown', e: '👑', label: 'a crown', at: 30 },
]
export const accById = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]))
export const unlockedAcc = (best) => ACCESSORIES.filter((a) => (best ?? 0) >= a.at)

export default function Character({ kind, mood = 'happy', size = 64, className = '', acc }) {
  const id = BUDDIES[kind] ? kind : LEGACY[kind] ?? 'cloud'
  const a = accById[acc]
  return (
    <span className={`character ${className}`} style={{ display: 'inline-grid', width: size, height: size, position: 'relative' }}>
      <Buddy id={id} mood={mood} size={size} />
      {a && <span className={`buddy-acc acc-${a.id}`} style={{ fontSize: Math.round(size * 0.42) }} aria-hidden="true">{a.e}</span>}
    </span>
  )
}
