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

// Starter lines for the journal, so there's never a blank page. The first ones come
// from how the day actually went; the rest are gentle openers. Tapping one starts the note.
export function journalStarters({ dayLog = {}, left, mealsLogged, habitsDone = 0, sleepH }) {
  const out = []
  if (mealsLogged > 0 && left != null && left >= 0) out.push('I stayed within my budget today. What helped was ')
  if (mealsLogged > 0 && left != null && left < 0) out.push('Today went over, and that’s okay. Next time I could ')
  if (habitsDone > 0) out.push(`I kept ${habitsDone === 1 ? 'my habit' : `${habitsDone} habits`} today. It felt `)
  if ((dayLog.workouts ?? []).length > 0 || +dayLog.steps >= 8000) out.push('I moved my body today, and afterwards I felt ')
  if (sleepH != null && sleepH < 7) out.push('I was short on sleep, so today I noticed ')
  out.push('Today I’m thankful for ', 'One small win today: ', 'Something I want to remember: ', 'Lord, today I need help with ')
  return out.slice(0, 4)
}

const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

// Habit ticks so far this week (Monday to today), for the shared weekly goal.
export function weekTicks(profile, todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const since = (new Date(y, m - 1, d).getDay() + 6) % 7 // days since Monday
  let n = 0
  for (let i = 0; i <= since; i++) {
    const day = profile.days?.[keyOf(new Date(y, m - 1, d - i))]
    n += (profile.habits ?? []).filter((id) => day?.habits?.[id]).length
  }
  return n
}

// One small focus for the day, chosen from what would help most right now.
export function oneThing({ profile, todayKey, yesterday, plans }) {
  const [y, m, d] = todayKey.split('-').map(Number)
  const ago = (n) => profile.days?.[keyOf(new Date(y, m - 1, d - n))]
  const habits = (profile.habits ?? []).map((id) => habitById[id]).filter(Boolean)
  if (!habits.length) return { emoji: '🌱', text: 'Pick one tiny habit to start with', go: 'habits' }
  if (yesterday && yesterday.net < 0) return { emoji: '📝', text: 'Log each meal before you eat it' }
  if (![0, 1, 2, 3].some((n) => +ago(n)?.weight > 0)) return { emoji: '⚖️', text: 'Step on the scale this morning' }
  const plan = plans?.find((p) => p.id === profile.trainPlan?.id)
  if (plan && profile.trainPlan.last !== todayKey && ![1].some((n) => ago(n)?.workouts?.length)) {
    const s = plan.sessions[(profile.trainPlan.done ?? 0) % plan.sessions.length]
    return { emoji: '💪', text: `Do your workout: ${s.name}`, go: 'train' }
  }
  // otherwise rotate through your habits, favouring the one ticked least this week
  const least = [...habits].sort((a, b) => [0, 1, 2, 3, 4, 5, 6].filter((n) => ago(n)?.habits?.[a.id]).length - [0, 1, 2, 3, 4, 5, 6].filter((n) => ago(n)?.habits?.[b.id]).length)[0]
  return { emoji: least.emoji, text: least.label }
}

// Wins beyond the scale: small things that show progress the scale can't.
export const WINS = [
  { id: 'energy', e: '⚡', label: 'More energy' }, { id: 'clothes', e: '👖', label: 'Clothes fit better' },
  { id: 'strong', e: '💪', label: 'Felt stronger' }, { id: 'sleep', e: '😴', label: 'Slept well' },
  { id: 'mood', e: '🙂', label: 'Good mood' }, { id: 'craving', e: '🙅', label: 'Beat a craving' },
  { id: 'moved', e: '🚶', label: 'Moved more' }, { id: 'kind', e: '💛', label: 'Was kind to myself' },
]
// All wins in the last `days` days, newest first: [{ k, id }]
export function recentWins(profile, todayKey, days = 30) {
  const from = new Date(todayKey + 'T12:00'); from.setDate(from.getDate() - days)
  const f = from.toISOString().slice(0, 10)
  return Object.entries(profile.days ?? {}).filter(([k]) => k > f && k <= todayKey)
    .flatMap(([k, d]) => (d?.wins ?? []).map((id) => ({ k, id }))).sort((a, b) => (a.k < b.k ? 1 : -1))
}
