// Client for /api/food (Gemini on the server). Needs internet + a signed-in user.
import { auth } from './firebase'

export async function askFood(body) {
  if (import.meta.env.MODE === 'demo') {
    await new Promise((ok) => setTimeout(ok, 600))
    return body.mode === 'photo'
      ? { name: 'Demo plate', kcal: 480, items: [{ name: 'Rice', portion: '1 cup', kcal: 205 }], confidence: 'medium' }
      : { results: [{ name: `${body.q} (demo online result)`, portion: '1 serving', kcal: 321 }, { name: `${body.q}, large`, portion: { amount: 1, unit: 'large bag' }, kcal: '640 kcal' }] }
  }
  if (!navigator.onLine) throw new Error('You’re offline. Type the calories for now.')
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to use AI.')
  const token = await user.getIdToken()
  const kind = body.mode === 'photo' ? 'photo' : 'search'
  const t0 = performance.now()
  // tell the server which AI model and setting worked last time, so it can skip its warm-up
  let hints = {}
  try { hints = JSON.parse(localStorage.getItem(HINT) || '{}') } catch { /* ignore */ }
  if (hints[kind]) body = { ...body, hint: hints[kind] }
  // give up after a while so the screen never sits on "Searching…" forever
  const signal = AbortSignal.timeout?.(body.mode === 'photo' ? 50000 : 15000)
  const r = await fetch('/api/food', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  .catch((e) => { throw new Error(e.name === 'TimeoutError' || e.name === 'AbortError' ? 'That took too long. Try again, or type the calories.' : 'Couldn’t reach the online search. Check your connection.') })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'AI is unavailable right now.')
  if (j.via?.model) {
    try {
      localStorage.setItem(HINT, JSON.stringify({ ...hints, [kind]: { model: j.via.model, x: j.via.x } }))
      // how long the last lookup really took (shown at the bottom of Settings)
      localStorage.setItem(LAST, JSON.stringify({ kind, total: Math.round(performance.now() - t0), ai: j.via.ms, model: j.via.model, at: Date.now() }))
    } catch { /* ignore */ }
  }
  return j
}

const HINT = 'bankcal:ai-hint'
const LAST = 'bankcal:ai-last'
export function lastLookup() { try { return JSON.parse(localStorage.getItem(LAST) || 'null') } catch { return null } }

// Wake the server when the food sheet opens, so it's ready by the time a search is typed.
let warmedAt = 0
export async function warmFood() {
  if (import.meta.env.MODE === 'demo' || !navigator.onLine || !auth.currentUser || Date.now() - warmedAt < 4 * 60 * 1000) return
  warmedAt = Date.now()
  try {
    const token = await auth.currentUser.getIdToken()
    fetch('/api/food', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: 'warm' }) }).catch(() => {})
  } catch { /* not important */ }
}

// AI answers can come back in odd shapes (numbers as text, objects instead of text, missing
// calories). Keep only clean { name, portion, kcal } items so the screen can always show them.
const txt = (v) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : v && typeof v === 'object' ? Object.values(v).filter((x) => typeof x === 'string' || typeof x === 'number').join(' ') : '').trim()
export function cleanFoods(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((x) => ({ name: txt(x?.name).slice(0, 120), portion: txt(x?.portion).slice(0, 60), kcal: x?.kcal == null || x.kcal === '' ? NaN : Math.round(Number(String(x.kcal).replace(/[^\d.]/g, '') || NaN)) }))
    .filter((x) => x.name && Number.isFinite(x.kcal) && x.kcal >= 0 && x.kcal < 6000)
    .slice(0, 6)
}
