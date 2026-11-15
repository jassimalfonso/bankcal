// Client for /api/food (Gemini on the server). Needs internet + a signed-in user.
import { auth } from './firebase'

export async function askFood(body) {
  if (!navigator.onLine) throw new Error('You’re offline. Type the calories for now.')
  const user = auth.currentUser
  if (!user) throw new Error('Sign in to use AI.')
  const token = await user.getIdToken()
  const r = await fetch('/api/food', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'AI is unavailable right now.')
  return j
}
