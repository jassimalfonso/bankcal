// Local-only store used for screenshot testing (npm run build -- --mode demo). Never used in production.
import { useCallback, useState } from 'react'
import { dayKey } from './calc'

export function useDemoStore() {
  const [profile, setProfile] = useState({
    name: 'Fart Monster', character: 'egg', theme: 'moss', sex: 'm', age: '', height: '', weight: '',
    activity: 'sedentary', goal: 'lose025', customBudget: '', mode: 'light', onboarded: new URLSearchParams(location.search).get('new') !== '1',
    ...(new URLSearchParams(location.search).has('seed') ? {
      age: '32', height: 173, weight: 83.4, targetWeight: 78,
      days: Object.fromEntries(Array.from({ length: 15 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (14 - i)); return [dayKey(d), { weight: Math.round((85.2 - i * 0.13 + (i % 3 === 0 ? 0.2 : 0)) * 10) / 10 }] })),
    } : {}),
  })
  const seed = new URLSearchParams(location.search).has('seed')
  const [entries, setEntries] = useState(() => {
    if (!seed) return []
    const out = []
    for (let i = 1; i <= 4; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      out.push({ id: 's' + i, ts: d.getTime(), day: dayKey(d), name: 'Chicken shawarma plate', kcal: 850, meal: 'Lunch' }, { id: 't' + i, ts: d.getTime(), day: dayKey(d), name: 'Karak chai', kcal: 180, meal: 'Snack' })
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
  return { profile, entries, updateProfile, setDay, addEntry, removeEntry }
}
