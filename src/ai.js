// Client for /api/food (Gemini on the server). Needs internet + a signed-in user.
import { auth } from './firebase'

export async function askFood(body) {
  if (!navigator.onLine) throw new Error('You’re offline. Type the calories for now.')
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to use AI.')
  const token = await user.getIdToken()
  // give up after a while so the screen never sits on "Searching…" forever
  const signal = AbortSignal.timeout?.(body.mode === 'photo' ? 30000 : 15000)
  const r = await fetch('/api/food', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  .catch((e) => { throw new Error(e.name === 'TimeoutError' || e.name === 'AbortError' ? 'That took too long. Try again, or type the calories.' : 'Couldn’t reach the online search. Check your connection.') })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'AI is unavailable right now.')
  return j
}
