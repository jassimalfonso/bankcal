// Local-only store used for screenshot testing (npm run build -- --mode demo). Never used in production.
import { useCallback, useState } from 'react'
import { dayKey } from './calc'

export function useDemoStore() {
  const [profile, setProfile] = useState({
    name: 'Fart Monster', character: 'egg', theme: 'moss', sex: 'm', age: '', height: '', weight: '',
    activity: 'sedentary', goal: 'lose025', customBudget: '', mode: 'light', onboarded: new URLSearchParams(location.search).get('new') !== '1',
    ...(new URLSearchParams(location.search).has('seed') ? {
      birthDate: new URLSearchParams(location.search).has('bday') ? '1994' + dayKey().slice(4) : '1994-03-08', height: 173, weight: 83.4, targetWeight: 78,
      myFoods: [['Starbucks brewed coffee, black (dark roast, Pike Place)', 5], ['Max’s Restaurant Plain Rice', 200], ['Proben', 280], ['Overnight oats with banana', 340], ['Chicken adobo, 1 cup', 420], ['Greek yoghurt + honey', 180], ['Pandesal x2', 240]].map(([name, kcal], i) => ({ id: 'mf' + i, name, kcal, portion: 'my food' })),
      days: Object.fromEntries(Array.from({ length: 15 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (14 - i)); return [dayKey(d), { weight: Math.round((85.2 - i * 0.13 + (i % 3 === 0 ? 0.2 : 0)) * 10) / 10, steps: 4000 + (i * 977) % 6000, sleep: { bed: ['23:40', '00:30', '23:10', '01:10', '00:20', '23:50', '00:45'][i % 7], wake: [0, 6].includes(d.getDay()) ? '08:40' : '06:45' } }] })),
    } : {}),
  })
  const seed = new URLSearchParams(location.search).has('seed')
  // ?legacy: today has workouts saved the old way (minutes + a note, no sets/reps), to test editing them
  if (new URLSearchParams(location.search).has('legacy') && !profile.days?.[dayKey()]?.workouts) {
    queueMicrotask(() => setProfile((p) => ({ ...p,
      routine: [{ id: 'rt1', name: 'Core twist', emoji: '🏋️', kind: 'reps', sets: 2, reps: 15, kg: 5, met: 3.8, rest: 60 }],
      days: { ...p.days, [dayKey()]: { ...(p.days?.[dayKey()] ?? {}), workouts: [
        { id: 'w1', type: 'custom', rid: 'rt1', min: 3.5, met: 3.8, label: 'Core twist', note: '2 × 15 @ 5 kg' },
        { id: 'w2', type: 'custom', min: 4.6, met: 3.1, label: 'Arm curl', note: '4 × 3 @ 5 kg' },
      ] } } })))
  }
  const [entries, setEntries] = useState(() => {
    if (!seed) return []
    const out = []
    for (let i = 1; i <= (new URLSearchParams(location.search).has('wcheck') ? 14 : 4); i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      out.push({ id: 's' + i, ts: d.getTime(), day: dayKey(d), name: 'Chicken adobo + rice', kcal: 700, meal: 'Lunch' }, { id: 'u' + i, ts: d.getTime(), day: dayKey(d), name: 'Iced tea ×2', kcal: 180, meal: 'Lunch', serving: '1 glass' }, { id: 't' + i, ts: d.getTime(), day: dayKey(d), name: 'Turon', kcal: 220, meal: 'Snack' })
    }
    return out
  })
  const updateProfile = useCallback((patch) => setProfile((p) => ({ ...p, ...patch })), [])
  const addEntry = useCallback((e) => {
    const now = new Date()
    const id = String(Math.random())
    setEntries((x) => [{ id, ts: now.getTime(), day: dayKey(now), ...e }, ...x])
    return id
  }, [])
  const setDay = useCallback((key, patch) => setProfile((p) => ({ ...p, days: { ...(p.days ?? {}), [key]: { ...(p.days?.[key] ?? {}), ...patch } } })), [])
  const removeEntry = useCallback((id) => setEntries((x) => x.filter((e) => e.id !== id)), [])
  const updateEntry = useCallback((id, patch) => setEntries((x) => x.map((e) => (e.id === id ? { ...e, ...patch } : e))), [])
  const resetProgress = useCallback(async () => { setEntries([]); setProfile((p) => ({ ...p, days: {}, badges: undefined, trainPlan: undefined })) }, [])
  return { profile, entries, updateProfile, setDay, addEntry, removeEntry, updateEntry, resetProgress }
}

// Fake linked partner for screenshot testing (?partner). Never used in production.
const NOTE_AT = Math.floor(Date.now() / 3600e3) * 3600e3 - 25 * 60e3 // stays put across re-renders and reloads within the hour
export const demoPartner = (today) => ({
  partners: ['p1'],
  shares: { p1: { did: [{ n: 'Dumbbell curl', d: '3 × 12 · 4 kg' }, { n: 'Morning walk', d: '30 min' }], lookups: [{ q: 'sundubu', at: Date.now() - 3600e3, r: [{ name: 'Korean Tofu Stew (Sundubu-jjigae)', kcal: 380, portion: '1 bowl (450 g)', per100: 84, cat: 'meal' }] }], name: 'Sewer Butt', character: 'avocado', theme: 'plum', day: today, streak: 3, habitsDone: 1, habitsTotal: 2, moved: true, logged: true, weekWithin: 4, weekLogged: 5, weekWorkouts: 2, weekTicks: 6, kgChange: -0.8, goalPct: 16, acc: 'bow', wins: [{ id: 'w-1', e: '💪', t: 'Dumbbell curl · 3 × 12 · 4 kg' }, { id: 'habits', e: '✅', t: 'All habits done' }, { id: 'streak-4', e: '🔥', t: '4 days on budget' }], foods: [{ name: 'Sinigang na baboy, 1 bowl', kcal: 310 }, { name: 'Tim Hortons iced capp, medium', kcal: 360 }, { name: 'Banana bread slice', kcal: 150, full: 230, serving: 'half slice' }, { name: 'Kiwi', kcal: 90 }, { name: 'Max’s Restaurant Plain Rice', kcal: 200 }, { name: 'Chicken shawarma wrap', kcal: 520 }, { name: 'Laban up, 250 ml', kcal: 150, full: 150 }], workouts: [{ name: 'Glute bridge', emoji: '🍑', kind: 'reps', sets: 3, reps: 15, rest: 45, met: 3.5, ex: 'bridge' }, { name: 'Dumbbell curl', emoji: '💪', kind: 'reps', sets: 3, reps: 12, kg: 4, rest: 60, met: 3.5, ex: 'curl' }, { name: 'Plank', emoji: '🧱', kind: 'time', sets: 3, sec: 30, rest: 45, met: 3.8, ex: 'plank' }], cheers: { me: { count: 2, log: [{ at: Date.now() - 2 * 3600e3, msg: '💪 You’ve got this' }] } } } },
  me: 'me', received: { p1: { name: 'Sewer Butt', at: NOTE_AT, msg: 'Proud of you for the walk today. Dinner at 7?', s: '🥑', count: 4, log: [{ at: Date.now() - 3600e3, msg: '❤️ Proud of you' }, { at: Date.now() - 26 * 3600e3, msg: '👏' }] } },
  push: { supported: true, on: false, turnOn: async () => {}, turnOff: async () => {} },
  cheer: async () => {}, createInvite: async () => 'ABC123', acceptInvite: async () => 'Sewer Butt', removePartner: () => {},
})
