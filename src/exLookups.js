// Exercises found online are remembered on this phone for 60 days, and shared with your partner,
// so the same search is instant next time for either of you (as with foods).
import { cleanExercises } from './ai'
import { shareLookups } from './partner'

const KEY = 'bankcal:online-exercises'
const seen = new Map() // search text → [{ name, emoji, kind, met, weighted, each }] (+ .at, .theirs)
try {
  for (const [k, v, at, theirs] of JSON.parse(localStorage.getItem(KEY) || '[]')) if (Date.now() - at < 60 * 864e5) seen.set(k, Object.assign(v, { at, ...(theirs ? { theirs: true } : {}) }))
} catch { /* start empty */ }

const sorted = () => [...seen].filter(([, v]) => v.length).sort((a, b) => b[1].at - a[1].at)
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(sorted().slice(0, 120).map(([k, v]) => [k, [...v], v.at, v.theirs ? 1 : 0]))) } catch { /* full: fine */ } }

export const exSeen = (k) => seen.get(k)
export function keepEx(k, list) {
  seen.set(k, Object.assign(list, { at: Date.now() }))
  if (!list.length) return // "nothing found" is only remembered until the app is closed
  store()
  shareLookups(sorted().filter(([, v]) => !v.theirs).map(([key, v]) => [key, [...v], v.at]), 'exLookups')
}
// what my partner has looked up
export function takeEx(list) {
  let added = false
  for (const l of Array.isArray(list) ? list : []) {
    const k = String(l?.q ?? '').toLowerCase()
    const r = cleanExercises(l?.r, 10)
    if (!k || !r.length || !(Date.now() - l.at < 60 * 864e5)) continue
    const mine = seen.get(k)
    if (mine?.length && (mine.at ?? 0) >= l.at) continue
    seen.set(k, Object.assign(r, { at: l.at, theirs: true })); added = true
  }
  if (added) store()
}
