// Local-first storage. Everything lives on this phone (localStorage).
// v0.3 will swap this for a synced backend without touching the screens.
import { useEffect, useState, useCallback } from 'react'
import { dayKey } from './calc'

const KEY = 'cal-bank:v1'

const DEFAULT = {
  active: 'fm',
  mode: 'auto', // appearance: auto | light | dark
  profiles: {
    fm: { name: 'Fart Monster', emoji: '👾', theme: 'moss', sex: 'm', age: '', height: '', weight: '', activity: 'sedentary', goal: 'lose025', customBudget: '' },
    sb: { name: 'Sewer Butt', emoji: '🐀', theme: 'plum', sex: 'f', age: '', height: '', weight: '', activity: 'sedentary', goal: 'lose025', customBudget: '' },
  },
  entries: [], // { id, pid, day, ts, name, kcal, meal, photo }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const s = JSON.parse(raw)
    return { ...DEFAULT, ...s, profiles: { ...DEFAULT.profiles, ...s.profiles } }
  } catch {
    return DEFAULT
  }
}

export function useStore() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full — photos are the usual cause; v0.2 moves them to IndexedDB */
    }
  }, [state])

  const setActive = useCallback((active) => setState((s) => ({ ...s, active })), [])
  const setMode = useCallback((mode) => setState((s) => ({ ...s, mode })), [])

  const updateProfile = useCallback(
    (pid, patch) => setState((s) => ({ ...s, profiles: { ...s.profiles, [pid]: { ...s.profiles[pid], ...patch } } })),
    [],
  )

  const addEntry = useCallback((e) => {
    const now = new Date()
    const entry = { id: crypto.randomUUID?.() ?? String(now.getTime()), ts: now.getTime(), day: dayKey(now), ...e }
    setState((s) => ({ ...s, entries: [entry, ...s.entries] }))
  }, [])

  const removeEntry = useCallback((id) => setState((s) => ({ ...s, entries: s.entries.filter((x) => x.id !== id) })), [])

  return { state, setActive, setMode, updateProfile, addEntry, removeEntry }
}

// Shrink a camera photo to a small JPEG thumbnail so storage stays light.
export function compressPhoto(file, max = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = reject
    img.src = url
  })
}
