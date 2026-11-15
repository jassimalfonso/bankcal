// Milestones: small wins on the way to the big goal. They reward showing up and effort
// as much as the scale. Once earned they stay earned (until you start fresh).
import { weightTrend } from './calc.js'

export const MILESTONES = [
  { id: 'first-log', emoji: '🍽️', label: 'First meal logged', hint: 'Log your first meal' },
  { id: 'log-3', emoji: '📝', label: '3 days logged', hint: 'Log food on 3 days' },
  { id: 'log-7', emoji: '🗓️', label: 'A full week logged', hint: 'Log food on 7 days' },
  { id: 'streak-3', emoji: '🔥', label: '3 days in a row on budget', hint: 'Stay within budget 3 days running' },
  { id: 'streak-7', emoji: '🏅', label: 'A week on budget', hint: 'Stay within budget 7 days running' },
  { id: 'streak-14', emoji: '🏆', label: 'Two weeks on budget', hint: 'Stay within budget 14 days running' },
  { id: 'weigh-1', emoji: '⚖️', label: 'First weigh-in', hint: 'Step on the scale and save it' },
  { id: 'weigh-7', emoji: '📈', label: '7 weigh-ins', hint: 'Weigh in on 7 mornings' },
  { id: 'kg-1', emoji: '🎈', label: 'First kilo down', hint: 'Lose 1 kg on your trend' },
  { id: 'kg-3', emoji: '🎉', label: '3 kg down', hint: 'Lose 3 kg on your trend' },
  { id: 'kg-5', emoji: '🌟', label: '5 kg down', hint: 'Lose 5 kg on your trend' },
  { id: 'half', emoji: '⛰️', label: 'Halfway to your goal', hint: 'Get halfway to your target weight' },
  { id: 'goal', emoji: '👑', label: 'Goal reached', hint: 'Reach your target weight' },
  { id: 'move-1', emoji: '💪', label: 'First workout', hint: 'Log your first workout' },
  { id: 'move-10', emoji: '🏋️', label: '10 workouts', hint: 'Log 10 workouts' },
  { id: 'steps-10k', emoji: '👟', label: 'A 10,000-step day', hint: 'Walk 10,000 steps in a day' },
  { id: 'habit-7', emoji: '🌱', label: '7 habit ticks', hint: 'Tick your habits 7 times' },
  { id: 'habit-30', emoji: '🌳', label: '30 habit ticks', hint: 'Tick your habits 30 times' },
  { id: 'journal-7', emoji: '✍️', label: '7 journal notes', hint: 'Write in your journal on 7 days' },
]

// Which milestones the data shows as reached right now.
export function reached({ entries, profile, streakDays }) {
  const days = profile.days ?? {}
  const vals = Object.values(days)
  const logged = new Set(entries.map((e) => e.day)).size
  const workouts = vals.reduce((a, d) => a + (d.workouts?.length ?? 0), 0)
  const ticks = vals.reduce((a, d) => a + Object.values(d.habits ?? {}).filter(Boolean).length, 0)
  const notes = vals.filter((d) => d.journal?.text?.trim() || d.journal?.mood).length
  const pts = weightTrend(Object.entries(days).filter(([, d]) => +d?.weight > 0).map(([k, d]) => ({ k, t: new Date(k + 'T12:00').getTime(), w: +d.weight })).sort((a, b) => a.t - b.t))
  const lost = pts.length > 1 ? pts[0].trend - pts.at(-1).trend : 0
  const target = profile.goal !== 'maintain' ? +profile.targetWeight : 0
  const start = pts[0]?.w, now = pts.at(-1)?.w
  const frac = target > 0 && start > target ? (start - now) / (start - target) : 0
  const on = {
    'first-log': logged >= 1, 'log-3': logged >= 3, 'log-7': logged >= 7,
    'streak-3': streakDays >= 3, 'streak-7': streakDays >= 7, 'streak-14': streakDays >= 14,
    'weigh-1': pts.length >= 1, 'weigh-7': pts.length >= 7,
    'kg-1': lost >= 1, 'kg-3': lost >= 3, 'kg-5': lost >= 5,
    half: frac >= 0.5, goal: pts.length > 1 && frac >= 1,
    'move-1': workouts >= 1, 'move-10': workouts >= 10,
    'steps-10k': vals.some((d) => +d.steps >= 10000),
    'habit-7': ticks >= 7, 'habit-30': ticks >= 30, 'journal-7': notes >= 7,
  }
  return MILESTONES.filter((m) => on[m.id]).map((m) => m.id)
}
