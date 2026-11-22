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
  { id: 'bow', e: '🎀', label: 'Bow' }, { id: 'cap', e: '🧢', label: 'Cap' }, { id: 'flowers', e: '🌸', label: 'Flower' },
  { id: 'tophat', e: '🎩', label: 'Top hat' }, { id: 'crown', e: '👑', label: 'Crown' }, { id: 'butterfly', e: '🦋', label: 'Butterfly' },
  { id: 'sun', e: '🕶️', label: 'Shades' }, { id: 'tree', e: '🎄', label: 'Festive tree' }, { id: 'grad', e: '🎓', label: 'Grad cap' },
  { id: 'phones', e: '🎧', label: 'Headphones' }, { id: 'sunhat', e: '👒', label: 'Sun hat' }, { id: 'sunflower', e: '🌻', label: 'Sunflower' },
  { id: 'star', e: '⭐', label: 'Star' }, { id: 'clover', e: '🍀', label: 'Clover' }, { id: 'balloon', e: '🎈', label: 'Balloon' },
  { id: 'heart', e: '💖', label: 'Heart' }, { id: 'rainbow', e: '🌈', label: 'Rainbow' }, { id: 'cake', e: '🎂', label: 'Birthday' },
]
export const accById = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]))

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
