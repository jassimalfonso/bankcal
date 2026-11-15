// Order of the sections under the balance on Today. Rearranged by holding and dragging.
export const DEFAULT_LAYOUT = ['words', 'partner', 'habits', 'weigh', 'meals', 'eat', 'deposits', 'journal']
export const SECTION_NAMES = { words: 'Today’s verse', partner: 'Together', habits: 'Tiny habits', weigh: 'Weigh-in', meals: 'Meals', eat: 'Eat again', deposits: 'Deposits', journal: 'Journal' }
export const SECTION_ICONS = { words: '📖', partner: '🤝', habits: '🌱', weigh: '⚖️', meals: '🍽️', eat: '🔁', deposits: '🚶', journal: '✍️' }
// Saved orders from before new sections existed get the new ones added in their default spot.
export function fullLayout(saved) {
  if (!saved) return DEFAULT_LAYOUT
  const out = saved.filter((id) => DEFAULT_LAYOUT.includes(id))
  DEFAULT_LAYOUT.forEach((id, i) => { if (!out.includes(id)) out.splice(Math.min(i, out.length), 0, id) })
  return out
}
