// Cute 3D avatars from Microsoft's Fluent Emoji (MIT licence, see public/avatars).
// A small mood face in the corner reacts to how the day is going.

export const AVATARS = [
  ['poo', 'Poo'], ['mouse', 'Mouse'], ['rat', 'Rat'], ['frog', 'Frog'], ['pig', 'Pig'],
  ['panda', 'Panda'], ['hamster', 'Hamster'], ['bunny', 'Bunny'], ['cat', 'Cat'], ['dog', 'Dog'],
  ['bear', 'Bear'], ['koala', 'Koala'], ['penguin', 'Penguin'], ['fox', 'Fox'], ['unicorn', 'Unicorn'],
  ['monkey', 'Monkey'], ['ghost', 'Ghost'], ['alien', 'Alien'], ['octopus', 'Octopus'], ['chick', 'Chick'],
].map(([id, label]) => ({ id, label }))

const LEGACY = { cloud: 'poo' } // older profiles

// mood: 'happy' | 'ok' | 'over' | 'sleep' | 'party'
export function moodFor(budget, spent) {
  if (budget == null) return 'sleep'
  const left = budget - spent
  if (left < 0) return 'over'
  if (left / budget < 0.15) return 'ok'
  return 'happy'
}

export default function Avatar({ id, mood, size = 64, className = '' }) {
  const src = `/avatars/${LEGACY[id] ?? id ?? 'panda'}.webp`
  return (
    <span className={`avatar-pic mood-${mood ?? 'none'} ${className}`} style={{ width: size, height: size }}>
      <img src={src} alt="" width={size} height={size} draggable="false" />
      {mood && <img className="mood" src={`/avatars/m-${mood}.webp`} alt="" style={{ width: size * 0.36, height: size * 0.36 }} />}
    </span>
  )
}
