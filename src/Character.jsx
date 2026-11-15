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
const ORDER = ['egg', 'avocado', 'mochi', 'onigiri', 'donut', 'toast', 'broccoli', 'dino', 'ghost', 'bean', 'cloud', 'blobcat']
export const CHARACTERS = ORDER.map((id) => ({ id, label: BUDDIES[id].label }))

// ids used by earlier versions
const LEGACY = { koala: 'egg', husky: 'egg', poo: 'egg', dog: 'avocado', rat: 'avocado', roo: 'avocado', mouse: 'avocado', panda: 'mochi' }

export default function Character({ kind, mood = 'happy', size = 64, className = '' }) {
  const id = BUDDIES[kind] ? kind : LEGACY[kind] ?? 'cloud'
  return (
    <span className={`character ${className}`} style={{ display: 'inline-grid', width: size, height: size }}>
      <Buddy id={id} mood={mood} size={size} />
    </span>
  )
}
