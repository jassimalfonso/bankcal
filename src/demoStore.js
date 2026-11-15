// Local-only store used for screenshot testing (npm run build -- --mode demo). Never used in production.
import { useCallback, useState } from 'react'
import { dayKey } from './calc'

export function useDemoStore() {
  const [profile, setProfile] = useState({
    name: 'Fart Monster', character: 'poo', theme: 'moss', sex: 'm', age: '', height: '', weight: '',
    activity: 'sedentary', goal: 'lose025', customBudget: '', mode: 'auto', onboarded: new URLSearchParams(location.search).get('new') !== '1',
  })
  const [entries, setEntries] = useState([])
  const updateProfile = useCallback((patch) => setProfile((p) => ({ ...p, ...patch })), [])
  const addEntry = useCallback((e) => {
    const now = new Date()
    const id = String(Math.random())
    setEntries((x) => [{ id, ts: now.getTime(), day: dayKey(now), ...e }, ...x])
    return id
  }, [])
  const removeEntry = useCallback((id) => setEntries((x) => x.filter((e) => e.id !== id)), [])
  return { profile, entries, updateProfile, addEntry, removeEntry }
}
