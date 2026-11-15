// Vercel serverless function: receives a weight from a phone Shortcut (which reads it
// from Apple Health, where Zepp and other smart-scale apps save it) and drops it in
// the user's inbox document. The personal key in the URL is the only credential;
// Firestore rules only allow the weight and time fields to change.
const PROJECT = 'bankcal-2d763'

export default async function handler(req, res) {
  const q = { ...(req.query || {}), ...(typeof req.body === 'object' && req.body ? req.body : {}) }
  const key = String(q.k || '')
  // Apple Health may hand over "83.4", "83,4" or "83.4 kg"
  const kg = parseFloat(String(q.kg ?? '').replace(',', '.'))
  if (!/^[a-z0-9]{24}$/.test(key)) return res.status(400).json({ ok: false, error: 'Missing or invalid key' })
  if (!(kg > 20 && kg < 400)) return res.status(400).json({ ok: false, error: 'Weight should be a number in kg, e.g. 83.4' })

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/inbox/${key}`
    + '?updateMask.fieldPaths=weight&updateMask.fieldPaths=at&currentDocument.exists=true'
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { weight: { doubleValue: Math.round(kg * 10) / 10 }, at: { stringValue: new Date().toISOString() } } }),
  })
  if (!r.ok) return res.status(r.status === 404 || r.status === 400 ? 404 : 502).json({ ok: false, error: r.status === 404 || r.status === 400 ? 'This sync link is no longer active. Reconnect in BankCal settings.' : 'Could not save right now' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ ok: true, saved: `${Math.round(kg * 10) / 10} kg` })
}
