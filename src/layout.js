// Order of the sections under the balance on Today. Users can rearrange them in Settings.
export const DEFAULT_LAYOUT = ['words', 'habits', 'partner', 'meals', 'eat', 'deposits', 'journal']
export const SECTION_NAMES = { words: 'Today’s verse and reflection', habits: 'Tiny habits', partner: 'Together (partner)', meals: 'Meals', eat: 'Eat again', deposits: 'Deposits (steps, workouts, sleep)', journal: 'Journal' }
// Saved orders from before new sections existed get the new ones added in their default spot.
export function fullLayout(saved) {
  if (!saved) return DEFAULT_LAYOUT
  const out = saved.filter((id) => DEFAULT_LAYOUT.includes(id))
  DEFAULT_LAYOUT.forEach((id, i) => { if (!out.includes(id)) out.splice(Math.min(i, out.length), 0, id) })
  return out
}
