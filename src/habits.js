// Tiny habits: small, specific actions that make the goal easier without willpower.
// Kept deliberately light: pick 1–3, tick when done, missed days are simply blank.
export const HABITS = [
  { id: 'logfirst', emoji: '📝', label: 'Log food before eating', why: 'Seeing the number first makes the choice easier. Keeping a food log is one of the most reliable habits for weight loss.', goal: 'lose' },
  { id: 'rice', emoji: '🍚', label: 'One cup of rice, not two', why: 'An easy swap that saves about 200 kcal a meal without giving up rice.', goal: 'lose' },
  { id: 'walk', emoji: '🚶', label: '10-minute walk after a meal', why: 'Helps your body handle the meal and quietly adds up your steps.', goal: 'both' },
  { id: 'water', emoji: '💧', label: 'Water with every meal', why: 'Often thirst feels like hunger. A glass first helps you eat at a calmer pace.', goal: 'both' },
  { id: 'veg', emoji: '🥗', label: 'Vegetables with lunch and dinner', why: 'Fills the plate and the stomach for very few calories.', goal: 'both' },
  { id: 'protein', emoji: '🥚', label: 'Protein at breakfast', why: 'Eggs, tuna or tokwa keep you fuller through the morning.', goal: 'both' },
  { id: 'closed', emoji: '🌙', label: 'Kitchen closed after dinner', why: 'Late-night snacking is where many budgets slip.', goal: 'lose' },
  { id: 'move', emoji: '💪', label: 'Move for 20 minutes', why: 'Any movement counts: a walk, a Train session, dancing.', goal: 'both' },
  { id: 'weigh', emoji: '⚖️', label: 'Weigh in after waking', why: 'Same time each day gives a truer trend. Daily ups and downs are normal.', goal: 'maintain' },
  { id: 'sleep', emoji: '😴', label: 'In bed by bedtime', why: 'Good sleep makes hunger easier to manage the next day.', goal: 'both' },
  { id: 'word', emoji: '📖', label: 'Read today’s verse', why: 'Start the day with your mind set before the noise.', goal: 'both' },
]
export const habitById = Object.fromEntries(HABITS.map((h) => [h.id, h]))
export const MAX_HABITS = 3

export function suggestHabits(goal) {
  const g = goal === 'maintain' ? 'maintain' : 'lose'
  return HABITS.filter((h) => h.goal === g || h.goal === 'both').slice(0, 3).map((h) => h.id)
}

// Last n days for a habit, oldest first, true/false per day.
export function habitDays(days, id, todayKey, n = 7) {
  const [y, m, d] = todayKey.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(y, m - 1, d - (n - 1 - i))
    const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    return !!days?.[k]?.habits?.[id]
  })
}

export const JOURNAL_PROMPTS = [
  'What went well today?',
  'What made today harder, and what might help tomorrow?',
  'What are you thankful for today?',
  'How is your body feeling?',
  'One small win from today:',
  'What did you notice about your hunger today?',
  'Where did you see God’s grace today?',
]
export const MOODS = [{ id: 1, e: '😔', label: 'Low' }, { id: 2, e: '😐', label: 'Okay' }, { id: 3, e: '🙂', label: 'Good' }, { id: 4, e: '😄', label: 'Great' }]
