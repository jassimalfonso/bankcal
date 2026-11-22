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

// Dress-up for your buddy: all free, just for fun.
export const ACCESSORIES = [
  // worn on the head
  { id: 'bow', e: '🎀', label: 'Bow', at: 'clip' }, { id: 'tophat', e: '🎩', label: 'Top hat', at: 'hat' },
  { id: 'crown', e: '👑', label: 'Crown', at: 'hat' }, { id: 'sunhat', e: '👒', label: 'Sun hat', at: 'hat' },
  { id: 'grad', e: '🎓', label: 'Grad cap', at: 'hat' }, { id: 'cap', e: '🧢', label: 'Cap', at: 'hat' },
  // clipped on the side
  { id: 'flowers', e: '🌸', label: 'Blossom', at: 'clip' }, { id: 'sunflower', e: '🌻', label: 'Sunflower', at: 'clip' },
  { id: 'tulip', e: '🌷', label: 'Tulip', at: 'clip' }, { id: 'daisy', e: '🌼', label: 'Daisy', at: 'clip' },
  { id: 'cherry', e: '🍒', label: 'Cherries', at: 'clip' }, { id: 'clover', e: '🍀', label: 'Clover', at: 'clip' },
  { id: 'star', e: '⭐', label: 'Star', at: 'clip' }, { id: 'heart', e: '💖', label: 'Heart', at: 'clip' },
  { id: 'butterfly', e: '🦋', label: 'Butterfly', at: 'clip' },
  // held
  { id: 'balloon', e: '🎈', label: 'Balloon', at: 'held' },
]
export const accById = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]))

export default function Character({ kind, mood = 'happy', size = 64, className = '', acc }) {
  const id = BUDDIES[kind] ? kind : LEGACY[kind] ?? 'cloud'
  const a = accById[acc]
  return (
    <span className={`character ${className}`} style={{ display: 'inline-grid', width: size, height: size, position: 'relative' }}>
      <Buddy id={id} mood={mood} size={size} />
      {a && <span className={`buddy-acc at-${a.at} acc-${a.id}`} style={{ fontSize: Math.round(size * (a.at === 'hat' ? 0.46 : 0.34)) }} aria-hidden="true">{a.e}</span>}
    </span>
  )
}
